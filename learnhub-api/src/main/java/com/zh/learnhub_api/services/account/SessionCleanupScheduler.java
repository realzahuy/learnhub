package com.zh.learnhub_api.services.account;

import com.zh.learnhub_api.repositories.account.UserSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
@Slf4j
public class SessionCleanupScheduler {

    private final UserSessionRepository sessionRepository;

    @Scheduled(fixedDelay = 1, timeUnit = TimeUnit.HOURS)
    @Transactional
    public void deleteExpiredSessions() {
        int deleted = sessionRepository.deleteExpired(LocalDateTime.now());
        if (deleted > 0) {
            log.info("Deleted {} expired user sessions", deleted);
        }
    }
}
