package com.zh.learnhub_api.services.realtime;

import com.zh.learnhub_api.services.notification.NotificationSseService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class AccountLockedRealtimeEventListener {

    private final NotificationSseService notificationSseService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAccountLocked(AccountLockedRealtimeEvent event) {
        notificationSseService.publishAccountLocked(event.userId());
    }
}
