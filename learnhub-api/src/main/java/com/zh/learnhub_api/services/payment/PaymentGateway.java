package com.zh.learnhub_api.services.payment;

import com.zh.learnhub_api.pojo.Payment;

import java.math.BigDecimal;
import java.util.Map;

public interface PaymentGateway {

    record CallbackResult(
            Long paymentId,
            boolean successful,
            BigDecimal amount,
            String transactionId) {
    }

    String getProviderName();

    String createPaymentUrl(Payment payment);

    boolean verifyCallback(Map<String, String> params);

    CallbackResult parseCallback(Map<String, String> params);
}
