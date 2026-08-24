package com.zh.learnhub_api.services.notification.email;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class AccountUnlockedEmailListener {

    private final AccountEmailSender accountEmailSender;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAccountUnlocked(AccountUnlockedEmailEvent event) {
        accountEmailSender.sendAccountUnlocked(event.toEmail(), event.fullName());
    }
}
