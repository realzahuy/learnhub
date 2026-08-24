package com.zh.learnhub_api.services.payment.paypal;

import com.paypal.sdk.PaypalServerSdkClient;
import com.paypal.sdk.exceptions.ApiException;
import com.paypal.sdk.models.AmountWithBreakdown;
import com.paypal.sdk.models.CaptureOrderInput;
import com.paypal.sdk.models.CaptureStatus;
import com.paypal.sdk.models.CheckoutPaymentIntent;
import com.paypal.sdk.models.CreateOrderInput;
import com.paypal.sdk.models.LinkDescription;
import com.paypal.sdk.models.Order;
import com.paypal.sdk.models.OrderRequest;
import com.paypal.sdk.models.OrdersCapture;
import com.paypal.sdk.models.PayeePaymentMethodPreference;
import com.paypal.sdk.models.PaymentSource;
import com.paypal.sdk.models.PaypalExperienceLandingPage;
import com.paypal.sdk.models.PaypalExperienceUserAction;
import com.paypal.sdk.models.PaypalWallet;
import com.paypal.sdk.models.PaypalWalletContextShippingPreference;
import com.paypal.sdk.models.PaypalWalletExperienceContext;
import com.paypal.sdk.models.PurchaseUnit;
import com.paypal.sdk.models.PurchaseUnitRequest;
import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.dtos.payment.PaymentResponseDTO;
import com.zh.learnhub_api.enums.PaymentStatus;
import com.zh.learnhub_api.exceptions.PaymentGatewayException;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.Payment;
import com.zh.learnhub_api.services.payment.ExchangeRateHttpClient;
import com.zh.learnhub_api.services.payment.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PayPalPaymentService extends PaymentService {

    private static final String REPRESENTATION_PREFERENCE = "return=representation";

    private final AppProperties.Paypal properties;
    private final PaypalServerSdkClient paypalClient;
    private final ExchangeRateHttpClient exchangeRateHttpClient;

    @Override
    public String getProviderName() {
        return "PAYPAL";
    }

    @Override
    public String createPaymentUrl(Payment payment) {
        ExchangeRateHttpClient.RateResponse exchangeRate = exchangeRateHttpClient.getRate(
                properties.currency(), "VND");
        BigDecimal amount = payment.getTotalPrice()
                .divide(exchangeRate.rate(), 2, RoundingMode.HALF_UP);
        String paymentId = payment.getId().toString();
        String returnUrl = UriComponentsBuilder.fromUriString(properties.returnUrl())
                .queryParam("provider", getProviderName())
                .queryParam("paymentId", payment.getId())
                .build()
                .toUriString();
        String cancelUrl = UriComponentsBuilder.fromUriString(properties.cancelUrl())
                .queryParam("provider", getProviderName())
                .queryParam("paymentId", payment.getId())
                .queryParam("cancelled", true)
                .build()
                .toUriString();

        PaypalWalletExperienceContext experienceContext = new PaypalWalletExperienceContext.Builder()
                .brandName("LearnHub")
                .locale("en-VN")
                .landingPage(PaypalExperienceLandingPage.LOGIN)
                .shippingPreference(PaypalWalletContextShippingPreference.NO_SHIPPING)
                .userAction(PaypalExperienceUserAction.PAY_NOW)
                .paymentMethodPreference(PayeePaymentMethodPreference.IMMEDIATE_PAYMENT_REQUIRED)
                .returnUrl(returnUrl)
                .cancelUrl(cancelUrl)
                .build();
        PaymentSource paymentSource = new PaymentSource.Builder()
                .paypal(new PaypalWallet.Builder()
                        .experienceContext(experienceContext)
                        .build())
                .build();
        AmountWithBreakdown paypalAmount = new AmountWithBreakdown.Builder(
                properties.currency(), amount.toPlainString())
                .build();
        PurchaseUnitRequest purchaseUnit = new PurchaseUnitRequest.Builder(paypalAmount)
                .referenceId(paymentId)
                .customId(paymentId)
                .invoiceId("LEARNHUB-" + paymentId)
                .description("Thanh toan khoa hoc LearnHub #" + paymentId)
                .build();
        OrderRequest request = new OrderRequest.Builder(
                CheckoutPaymentIntent.CAPTURE, List.of(purchaseUnit))
                .paymentSource(paymentSource)
                .build();
        CreateOrderInput input = new CreateOrderInput.Builder(
                MediaType.APPLICATION_JSON_VALUE, request)
                .paypalRequestId("learnhub-create-" + paymentId)
                .prefer(REPRESENTATION_PREFERENCE)
                .build();

        Order response;
        try {
            response = paypalClient.getOrdersController().createOrder(input).getResult();
        } catch (ApiException | IOException exception) {
            throw new PaymentGatewayException("Lỗi tạo thanh toán PayPal", exception);
        }
        return response.getLinks().stream()
                .filter(link -> "payer-action".equalsIgnoreCase(link.getRel())
                        || "approve".equalsIgnoreCase(link.getRel()))
                .map(LinkDescription::getHref)
                .findFirst()
                .orElse(null);
    }

    @Transactional(noRollbackFor = PaymentGatewayException.class)
    public PaymentResponseDTO capturePayment(Long paymentId, String orderId, Long userId) {
        Payment payment = paymentRepository.findByIdAndUserIdForUpdate(paymentId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thanh toán"));
        if (!PaymentStatus.PENDING.name().equals(payment.getStatus())) {
            return toPaymentResponse(payment);
        }

        CaptureOrderInput input = new CaptureOrderInput.Builder(
                orderId, MediaType.APPLICATION_JSON_VALUE)
                .paypalRequestId("learnhub-capture-" + paymentId)
                .prefer(REPRESENTATION_PREFERENCE)
                .build();

        Order response;
        try {
            response = paypalClient.getOrdersController().captureOrder(input).getResult();
        } catch (ApiException | IOException exception) {
            failPayment(payment);
            throw new PaymentGatewayException("Lỗi xác nhận PayPal", exception);
        }
        PurchaseUnit purchaseUnit = response.getPurchaseUnits().stream()
                .filter(unit -> paymentId.toString().equals(unit.getCustomId()))
                .findFirst()
                .orElse(null);
        if (purchaseUnit == null) {
            failPayment(payment);
            throw new PaymentGatewayException("Sai đơn PayPal");
        }
        OrdersCapture capture = purchaseUnit.getPayments()
                .getCaptures()
                .stream()
                .filter(item -> item.getStatus() == CaptureStatus.COMPLETED)
                .findFirst()
                .orElse(null);
        if (capture == null) {
            failPayment(payment);
            throw new PaymentGatewayException("Capture PayPal chưa hoàn tất");
        }
        completePayment(payment, capture.getId());
        return toPaymentResponse(payment);
    }
}
