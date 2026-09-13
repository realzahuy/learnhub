package com.zh.learnhub_api.services.payment.paypal;

import com.paypal.sdk.PaypalServerSdkClient;
import com.paypal.sdk.exceptions.ApiException;
import com.paypal.sdk.models.*;
import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.dtos.payment.PaymentResponseDTO;
import com.zh.learnhub_api.enums.PaymentMethod;
import com.zh.learnhub_api.enums.PaymentStatus;
import com.zh.learnhub_api.exceptions.PaymentGatewayException;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.mappers.PaymentMapper;
import com.zh.learnhub_api.pojo.Payment;
import com.zh.learnhub_api.pojo.PaymentItem;
import com.zh.learnhub_api.repositories.account.UserRepository;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import com.zh.learnhub_api.repositories.learning.EnrollmentRepository;
import com.zh.learnhub_api.repositories.payment.PaymentItemRepository;
import com.zh.learnhub_api.repositories.payment.PaymentRepository;
import com.zh.learnhub_api.services.payment.ExchangeRateHttpClient;
import com.zh.learnhub_api.services.payment.PaymentService;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
public class PayPalPaymentService extends PaymentService {

    private static final String REPRESENTATION_PREFERENCE = "return=representation";

    private final AppProperties.Paypal properties;
    private final PaypalServerSdkClient paypalClient;
    private final ExchangeRateHttpClient exchangeRateHttpClient;

    public PayPalPaymentService(
            UserRepository userRepository,
            CourseRepository courseRepository,
            EnrollmentRepository enrollmentRepository,
            PaymentRepository paymentRepository,
            PaymentItemRepository paymentItemRepository,
            AppProperties.Payment paymentProperties,
            AppProperties.Paypal properties,
            PaypalServerSdkClient paypalClient,
            ExchangeRateHttpClient exchangeRateHttpClient) {
        super(userRepository, courseRepository, enrollmentRepository, paymentRepository,
                paymentItemRepository, paymentProperties);
        this.properties = properties;
        this.paypalClient = paypalClient;
        this.exchangeRateHttpClient = exchangeRateHttpClient;
    }

    @Override
    public PaymentMethod getProvider() {
        return PaymentMethod.PAYPAL;
    }

    @Override
    public String createPaymentUrl(Payment payment) {
        ExchangeRateHttpClient.RateResponse exchangeRate = exchangeRateHttpClient.getRate(
                properties.currency(), "VND");
        BigDecimal amount = payment.getTotalPrice()
                .divide(exchangeRate.rate(), 2, RoundingMode.HALF_UP);
        String paymentId = payment.getId().toString();
        String returnUrl = UriComponentsBuilder.fromUriString(properties.returnUrl())
                .queryParam("provider", getProvider())
                .queryParam("paymentId", payment.getId())
                .build()
                .toUriString();
        String cancelUrl = UriComponentsBuilder.fromUriString(properties.cancelUrl())
                .queryParam("provider", getProvider())
                .queryParam("paymentId", payment.getId())
                .queryParam("cancelled", true)
                .build()
                .toUriString();

        PaypalWalletExperienceContext experienceContext = new PaypalWalletExperienceContext.Builder()
                .brandName(paymentProperties.brand())
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
                .invoiceId(paymentProperties.brand() + "-" + paymentId)
                .description(getOrderInfo(payment.getId()))
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
        if (payment.getStatus() != PaymentStatus.PENDING) {
            return toPaymentResponse(payment);
        }

        return capturePayment(payment, orderId);
    }

    @Transactional
    public void handleWebhook(String eventType, String orderId) {
        Order order;
        try {
            order = paypalClient.getOrdersController()
                    .getOrder(new GetOrderInput.Builder(orderId).build()).getResult();
        } catch (ApiException | IOException exception) {
            throw new PaymentGatewayException("Lỗi đọc đơn PayPal", exception);
        }
        PurchaseUnit unit = order.getPurchaseUnits().getFirst();
        Long paymentId = Long.valueOf(unit.getCustomId());
        Payment payment = paymentRepository.findByIdForUpdate(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thanh toán"));
        if (payment.getMethod() != PaymentMethod.PAYPAL
                || !(paymentProperties.brand() + "-" + paymentId).equals(unit.getInvoiceId())) {
            throw new SecurityException("Sai đơn PayPal");
        }
        if (payment.getStatus() == PaymentStatus.SUCCESS) return;

        List<OrdersCapture> captures = unit.getPayments() == null
                || unit.getPayments().getCaptures() == null
                ? List.of() : unit.getPayments().getCaptures();
        OrdersCapture completed = captures.stream()
                .filter(capture -> capture.getStatus() == CaptureStatus.COMPLETED)
                .findFirst().orElse(null);
        if (completed != null) {
            completePayment(payment, completed.getId());
            return;
        }
        if ("PAYMENT.CAPTURE.COMPLETED".equals(eventType)) {
            throw new PaymentGatewayException("Chưa xác nhận được capture PayPal");
        }
        if ("PAYMENT.CAPTURE.DENIED".equals(eventType)
                || "PAYMENT.CAPTURE.DECLINED".equals(eventType)) {
            failPayment(payment);
            return;
        }
        if (payment.getStatus() == PaymentStatus.PENDING && captures.isEmpty()) {
            capturePayment(payment, orderId);
        }
    }

    private PaymentResponseDTO capturePayment(Payment payment, String orderId) {
        Long paymentId = payment.getId();

        CaptureOrderInput input = new CaptureOrderInput.Builder(
                orderId, MediaType.APPLICATION_JSON_VALUE)
                .paypalRequestId("learnhub-capture-" + paymentId)
                .prefer(REPRESENTATION_PREFERENCE)
                .build();

        Order response;
        try {
            response = paypalClient.getOrdersController().captureOrder(input).getResult();
        } catch (ApiException | IOException exception) {
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
        List<OrdersCapture> captures = purchaseUnit.getPayments() == null
                || purchaseUnit.getPayments().getCaptures() == null
                ? List.of() : purchaseUnit.getPayments().getCaptures();
        OrdersCapture capture = captures.stream()
                .filter(item -> item.getStatus() == CaptureStatus.COMPLETED)
                .findFirst()
                .orElse(null);
        if (capture == null) {
            if (captures.stream().anyMatch(item -> item.getStatus() == CaptureStatus.DECLINED
                    || item.getStatus() == CaptureStatus.FAILED)) {
                failPayment(payment);
            }
            return toPaymentResponse(payment);
        }
        List<PaymentItem> items = completePayment(payment, capture.getId());
        return PaymentMapper.toDTO(payment, items);
    }
}
