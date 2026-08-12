package com.zh.learnhub_api.services.payment;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.pojo.Payment;
import com.zh.learnhub_api.pojo.User;
import com.zh.learnhub_api.repositories.payment.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PaymentExpirationService {

    private final PaymentRepository paymentRepository;
    private final PaymentLifecycle paymentLifecycle;
    private final int expireMinutes;

    public PaymentExpirationService(
            PaymentRepository paymentRepository,
            PaymentLifecycle paymentLifecycle,
            AppProperties.Payment properties) {
        this.paymentRepository = paymentRepository;
        this.paymentLifecycle = paymentLifecycle;
        this.expireMinutes = properties.expireMinutes();
    }

    @Transactional
    public int expireAllOverdue() {
        LocalDateTime now = LocalDateTime.now();
        return paymentRepository.expireAllOverdue(threshold(now), now);
    }

    @Transactional
    public int expireOverdueForCourses(User user, List<Long> courseIds) {
        if (courseIds.isEmpty()) {
            return 0;
        }
        LocalDateTime now = LocalDateTime.now();
        return paymentRepository.expireOverdueByUserAndCourseIds(
                user, courseIds, threshold(now), now);
    }

    @Transactional
    public Payment expireIfOverdue(Payment payment) {
        LocalDateTime now = LocalDateTime.now();
        if (paymentLifecycle.isPending(payment)
                && payment.getCreatedAt() != null
                && !payment.getCreatedAt().isAfter(threshold(now))) {
            paymentLifecycle.markExpired(payment, now);
        }
        return payment;
    }

    public int getExpireMinutes() {
        return expireMinutes;
    }

    private LocalDateTime threshold(LocalDateTime now) {
        return now.minusMinutes(expireMinutes);
    }
}
