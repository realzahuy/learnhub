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
public class AccountUnlockedEmailListener {

    private final AccountEmailSender accountEmailSender;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAccountUnlocked(AccountUnlockedEmailEvent event) {
        try {
            accountEmailSender.sendAccountUnlocked(event.toEmail(), event.fullName());
        } catch (RuntimeException ex) {
            log.error("Tài khoản đã mở khóa nhưng không gửi được email thông báo tới {}: {}",
                    AccountEmailSender.maskEmail(event.toEmail()), ex.getMessage(), ex);
        }
    }
}
