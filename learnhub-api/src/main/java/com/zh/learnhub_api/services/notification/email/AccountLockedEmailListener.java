package com.zh.learnhub_api.services.notification.email;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class AccountLockedEmailListener {

    private final AccountEmailSender accountEmailSender;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAccountLocked(AccountLockedEmailEvent event) {
        try {
            accountEmailSender.sendAccountLocked(
                    event.toEmail(), event.fullName(), event.adminEmail());
        } catch (RuntimeException ex) {
            log.error("Tài khoản đã khóa nhưng không gửi được email thông báo tới {}: {}",
                    AccountEmailSender.maskEmail(event.toEmail()), ex.getMessage(), ex);
        }
    }
}
