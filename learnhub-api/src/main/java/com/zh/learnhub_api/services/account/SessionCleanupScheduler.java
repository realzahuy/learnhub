package com.zh.learnhub_api.services.account;

import com.zh.learnhub_api.repositories.account.UserSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class SessionCleanupScheduler {

    private final UserSessionRepository sessionRepository;

    @Scheduled(fixedDelayString = "${app.scheduler.session-cleanup-delay-ms}")
    @Transactional
    public void deleteExpiredSessions() {
        sessionRepository.deleteExpired(LocalDateTime.now());
    }
}
