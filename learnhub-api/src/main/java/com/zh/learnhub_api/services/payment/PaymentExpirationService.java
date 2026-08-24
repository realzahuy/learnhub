package com.zh.learnhub_api.services.payment;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.enums.PaymentStatus;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.Payment;
import com.zh.learnhub_api.repositories.payment.PaymentRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class PaymentExpirationService {

    private final PaymentRepository paymentRepository;
    private final int expireMinutes;

    public PaymentExpirationService(
            PaymentRepository paymentRepository,
            AppProperties.Payment properties) {
        this.paymentRepository = paymentRepository;
        this.expireMinutes = properties.expireMinutes();
    }

    @Scheduled(fixedDelayString = "${app.scheduler.payment-expiration-scan-delay-ms}")
    @Transactional
    public void expireOverduePayments() {
        LocalDateTime now = LocalDateTime.now();
        paymentRepository.expireAllOverdue(now.minusMinutes(expireMinutes), now);
    }

    @Transactional
    public Payment expireIfOverdue(Payment payment, Long userId) {
        LocalDateTime now = LocalDateTime.now();
        if (PaymentStatus.PENDING.name().equals(payment.getStatus())
                && payment.getCreatedAt() != null
                && !payment.getCreatedAt().isAfter(now.minusMinutes(expireMinutes))) {
            paymentRepository.expireOverdueByIdAndUserId(
                    payment.getId(), userId, now.minusMinutes(expireMinutes), now);
            return paymentRepository.findByIdAndUserId_Id(payment.getId(), userId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Không tìm thấy đơn thanh toán"));
        }
        return payment;
    }
}
