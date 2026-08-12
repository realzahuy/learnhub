package com.zh.learnhub_api.services.payment;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.util.concurrent.TimeUnit;

@Component
@Slf4j
public class PaymentExpirationScheduler {

    private final PaymentExpirationService expirationService;

    public PaymentExpirationScheduler(PaymentExpirationService expirationService) {
        this.expirationService = expirationService;
    }

    @Scheduled(fixedDelay = 5, timeUnit = TimeUnit.MINUTES)
    public void expireOverduePayments() {
        int expired = expirationService.expireAllOverdue();

        if (expired > 0) {
            log.info("Đã tự động chuyển {} payment quá hạn sang EXPIRED", expired);
        }
    }
}
