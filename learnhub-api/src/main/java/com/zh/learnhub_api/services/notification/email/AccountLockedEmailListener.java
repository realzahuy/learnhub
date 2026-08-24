package com.zh.learnhub_api.services.notification.email;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class AccountLockedEmailListener {

    private final AccountEmailSender accountEmailSender;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAccountLocked(AccountLockedEmailEvent event) {
        accountEmailSender.sendAccountLocked(event.toEmail(), event.fullName(), event.adminEmail());
    }
}
