package com.zh.learnhub_api.services.payment.momo;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.enums.PaymentStatus;
import com.zh.learnhub_api.exceptions.PaymentGatewayException;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.Payment;
import com.zh.learnhub_api.services.payment.PaymentService;
import com.zh.learnhub_api.services.payment.momo.MoMoHttpClient.CreatePaymentRequest;
import com.zh.learnhub_api.services.payment.momo.MoMoHttpClient.CreatePaymentResponse;
import com.zh.learnhub_api.utils.MoMoUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MoMoPaymentService extends PaymentService {

    private static final int MOMO_SUCCESS_RESULT_CODE = 0;

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

        String rawData = "accessKey=" + momoConfig.accessKey()
                + "&amount=" + amount
                + "&extraData=" + extraData
                + "&ipnUrl=" + momoConfig.notifyUrl()
                + "&orderId=" + orderId
                + "&orderInfo=" + orderInfo
                + "&partnerCode=" + momoConfig.partnerCode()
                + "&redirectUrl=" + momoConfig.returnUrl()
                + "&requestId=" + requestId
                + "&requestType=" + requestType;

        CreatePaymentRequest request = CreatePaymentRequest.builder()
                .orderExpireTime(paymentProperties.expireMinutes())
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
                .signature(MoMoUtils.hmacSHA256(momoConfig.secretKey(), rawData))
                .lang("vi")
                .build();

        CreatePaymentResponse response = momoHttpClient.createPayment(request);
        if (response.getResultCode() != MOMO_SUCCESS_RESULT_CODE) {
            throw new PaymentGatewayException("MoMo từ chối tạo giao dịch (mã kết quả=" + response.getResultCode() + ").");
        }
        return response.getPayUrl();
    }

    @Transactional(noRollbackFor = SecurityException.class)
    public void handleNotify(Map<String, Object> data) {
        Map<String, String> params = new HashMap<>();
        data.forEach((key, value) ->
                params.put(key, value == null ? "" : String.valueOf(value)));

        String rawData = "accessKey=" + momoConfig.accessKey()
                + "&amount=" + params.get("amount")
                + "&extraData=" + params.getOrDefault("extraData", "")
                + "&message=" + params.get("message")
                + "&orderId=" + params.get("orderId")
                + "&orderInfo=" + params.get("orderInfo")
                + "&orderType=" + params.get("orderType")
                + "&partnerCode=" + params.get("partnerCode")
                + "&payType=" + params.get("payType")
                + "&requestId=" + params.get("requestId")
                + "&responseTime=" + params.get("responseTime")
                + "&resultCode=" + params.get("resultCode")
                + "&transId=" + params.get("transId");
        String signature = MoMoUtils.hmacSHA256(momoConfig.secretKey(), rawData);
        if (!signature.equals(params.get("signature"))) {
            throw new SecurityException("Chữ ký thanh toán không hợp lệ");
        }

        Long paymentId = MoMoUtils.parsePaymentId(params.get("orderId"));
        int resultCode = Integer.parseInt(params.get("resultCode"));
        Payment payment = paymentRepository.findByIdForUpdate(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn thanh toán"));
        if (!PaymentStatus.PENDING.name().equals(payment.getStatus())) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        if (resultCode != MOMO_SUCCESS_RESULT_CODE) {
            payment.setStatus(PaymentStatus.FAILED.name());
            payment.setUpdatedAt(now);
            return;
        }

        completePayment(payment, params.get("transId"));
    }
}
