package com.zh.learnhub_api.services.payment;

import com.zh.learnhub_api.enums.PaymentStatus;
import com.zh.learnhub_api.pojo.Payment;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class PaymentLifecycle {

    public boolean isPending(Payment payment) {
        return currentStatus(payment) == PaymentStatus.PENDING;
    }

    public void markSuccessful(Payment payment, String transactionId, LocalDateTime now) {
        transitionFromPending(payment, PaymentStatus.SUCCESS, now);
        payment.setTransactionId(transactionId);
    }

    public void markFailed(Payment payment, LocalDateTime now) {
        transitionFromPending(payment, PaymentStatus.FAILED, now);
    }

    public void markExpired(Payment payment, LocalDateTime now) {
        transitionFromPending(payment, PaymentStatus.EXPIRED, now);
    }

    private void transitionFromPending(Payment payment, PaymentStatus target,
                                       LocalDateTime now) {
        PaymentStatus current = currentStatus(payment);
        if (current != PaymentStatus.PENDING) {
            throw new IllegalStateException(
                    "Không thể chuyển payment từ " + current + " sang " + target);
        }

        payment.setStatus(target.name());
        payment.setUpdatedAt(now);
    }

    private PaymentStatus currentStatus(Payment payment) {
        try {
            return PaymentStatus.valueOf(payment.getStatus());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new IllegalStateException(
                    "Payment có trạng thái không hợp lệ: " + payment.getStatus(), e);
        }
    }
}
