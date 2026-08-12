package com.zh.learnhub_api.services.payment.momo;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.exceptions.PaymentGatewayException;
import com.zh.learnhub_api.pojo.Payment;
import com.zh.learnhub_api.services.payment.PaymentGateway;
import com.zh.learnhub_api.services.payment.momo.MoMoHttpClient.CreatePaymentRequest;
import com.zh.learnhub_api.services.payment.momo.MoMoHttpClient.CreatePaymentResponse;
import com.zh.learnhub_api.utils.MoMoUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientResponseException;

import java.math.BigDecimal;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class MoMoPaymentGateway implements PaymentGateway {

    private final AppProperties.Momo momoConfig;
    private final MoMoHttpClient momoHttpClient;
    private final AppProperties.Payment paymentProperties;

    @Override
    public String getProviderName() {
        return "MOMO";
    }

    @Override
    public String createPaymentUrl(Payment payment) {

        String orderId = payment.getId() + "_" + System.currentTimeMillis();
        String requestId = orderId;
        String amount = String.valueOf(payment.getTotalPrice().longValue());
        String orderInfo = "Thanh toan khoa hoc LearnHub - " + payment.getId();
        String requestType = "payWithATM";
        String extraData = "";

        String rawData = "accessKey=" + momoConfig.accessKey() +
            "&amount=" + amount +
            "&extraData=" + extraData +
            "&ipnUrl=" + momoConfig.notifyUrl() +
            "&orderId=" + orderId +
            "&orderInfo=" + orderInfo +
            "&partnerCode=" + momoConfig.partnerCode() +
            "&redirectUrl=" + momoConfig.returnUrl() +
            "&requestId=" + requestId +
            "&requestType=" + requestType;

        String signature = MoMoUtils.hmacSHA256(momoConfig.secretKey(), rawData);

        log.debug("MoMo raw signature data: {}", rawData);

        CreatePaymentRequest requestBody = CreatePaymentRequest.builder()
                .orderExpireTime(String.valueOf(paymentProperties.expireMinutes()))
                .partnerCode(momoConfig.partnerCode())
                .accessKey(momoConfig.accessKey())
                .requestId(requestId)
                .amount(amount)
                .orderId(orderId)
                .orderInfo(orderInfo)
                .redirectUrl(momoConfig.returnUrl())
                .ipnUrl(momoConfig.notifyUrl())
                .extraData(extraData)
                .requestType(requestType)
                .signature(signature)
                .lang("vi")
                .build();

        try {
            CreatePaymentResponse responseBody = momoHttpClient.createPayment(requestBody);

            if (responseBody != null && responseBody.getPayUrl() != null) {
                return responseBody.getPayUrl();
            }

            Object resultCode = responseBody != null ? responseBody.getResultCode() : null;
            Object message = responseBody != null ? responseBody.getMessage() : "không có body";
            throw new PaymentGatewayException(
                "MoMo từ chối tạo giao dịch (resultCode=" + resultCode + "): " + message);

        } catch (RestClientResponseException e) {

            log.error("MoMo từ chối tạo giao dịch cho đơn {}: {}", orderId, e.getResponseBodyAsString());
            throw new PaymentGatewayException(
                "Cổng thanh toán MoMo từ chối giao dịch. Vui lòng thử lại sau.", e);
        } catch (PaymentGatewayException e) {

            throw e;
        } catch (Exception e) {
            log.error("Không gọi được MoMo cho đơn {}", orderId, e);
            throw new PaymentGatewayException("Không kết nối được cổng thanh toán MoMo.", e);
        }
    }

    @Override
    public boolean verifyCallback(Map<String, String> params) {
        try {
            String momoSignature = params.get("signature");
            String amount = params.get("amount");
            String extraData = params.getOrDefault("extraData", "");
            String message = params.get("message");
            String orderId = params.get("orderId");
            String orderInfo = params.get("orderInfo");
            String orderType = params.get("orderType");
            String partnerCode = params.get("partnerCode");
            String payType = params.get("payType");
            String requestId = params.get("requestId");
            String responseTime = params.get("responseTime");
            String resultCode = params.get("resultCode");
            String transId = params.get("transId");

            String rawData = "accessKey=" + momoConfig.accessKey() +
                "&amount=" + amount +
                "&extraData=" + extraData +
                "&message=" + message +
                "&orderId=" + orderId +
                "&orderInfo=" + orderInfo +
                "&orderType=" + orderType +
                "&partnerCode=" + partnerCode +
                "&payType=" + payType +
                "&requestId=" + requestId +
                "&responseTime=" + responseTime +
                "&resultCode=" + resultCode +
                "&transId=" + transId;

            String mySignature = MoMoUtils.hmacSHA256(momoConfig.secretKey(), rawData);

            return mySignature.equals(momoSignature);
        } catch (Exception e) {
            log.error("Lỗi khi verify callback MoMo", e);
            return false;
        }
    }

    @Override
    public CallbackResult parseCallback(Map<String, String> params) {
        Long paymentId = MoMoUtils.parsePaymentId(params.get("orderId"));

        try {
            return new CallbackResult(
                    paymentId,
                    "0".equals(params.get("resultCode")),
                    new BigDecimal(params.get("amount")),
                    params.get("transId"));
        } catch (NumberFormatException | NullPointerException e) {
            throw new IllegalArgumentException("Số tiền callback MoMo không hợp lệ", e);
        }
    }
}
