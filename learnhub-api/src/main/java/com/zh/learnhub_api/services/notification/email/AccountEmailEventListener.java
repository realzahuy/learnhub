package com.zh.learnhub_api.services.notification.email;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class AccountEmailEventListener {

    private final AccountEmailSender accountEmailSender;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAccountLocked(Locked event) {
        accountEmailSender.sendAccountLocked(event.toEmail(), event.fullName(), event.adminEmail());
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAccountUnlocked(Unlocked event) {
        accountEmailSender.sendAccountUnlocked(event.toEmail(), event.fullName());
    }

    public record Locked(String toEmail, String fullName, String adminEmail) {}

    public record Unlocked(String toEmail, String fullName) {}
}
