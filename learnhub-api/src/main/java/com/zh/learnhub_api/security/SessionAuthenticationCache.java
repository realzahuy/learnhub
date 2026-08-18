package com.zh.learnhub_api.security;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.enums.AccountStatus;
import com.zh.learnhub_api.projections.account.SessionAuthenticationProjection;
import com.zh.learnhub_api.repositories.account.UserSessionRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Duration;
import java.time.LocalDateTime;

@Component
public class SessionAuthenticationCache {

    private final UserSessionRepository sessionRepository;
    private final Cache<Long, CachedSessionAuthentication> sessions;
    private final Cache<Long, Long> userGenerations;
    private final Cache<Long, Long> sessionGenerations;

    public SessionAuthenticationCache(
            UserSessionRepository sessionRepository,
            AppProperties.AuthCache properties) {
        this.sessionRepository = sessionRepository;

        long maximumSize = Math.max(1, properties.maximumSize());
        Duration sessionTtl = Duration.ofMinutes(
                Math.max(1, properties.expireAfterWriteMinutes()));
        Duration generationTtl = sessionTtl.plusMinutes(5);

        this.sessions = Caffeine.newBuilder()
                .maximumSize(maximumSize)
                .expireAfterWrite(sessionTtl)
                .build();
        this.userGenerations = Caffeine.newBuilder()
                .maximumSize(maximumSize)
                .expireAfterWrite(generationTtl)
                .build();
        this.sessionGenerations = Caffeine.newBuilder()
                .maximumSize(maximumSize)
                .expireAfterWrite(generationTtl)
                .build();
    }

    public boolean isActive(Long sessionId, Long userId, LocalDateTime now) {
        CachedSessionAuthentication cached = sessions.getIfPresent(sessionId);
        if (cached != null && cached.matches(
                userId,
                generation(userGenerations, userId),
                generation(sessionGenerations, sessionId),
                now)) {
            return true;
        }
        if (cached != null) {
            sessions.invalidate(sessionId);
        }

        long userGeneration = generation(userGenerations, userId);
        long sessionGeneration = generation(sessionGenerations, sessionId);
        SessionAuthenticationProjection loaded = sessionRepository
                .findAuthenticationById(sessionId)
                .orElse(null);
        if (loaded == null
                || !userId.equals(loaded.getUserId())
                || loaded.getAccountStatus() != AccountStatus.ACTIVE
                || !loaded.getExpiresAt().isAfter(now)) {
            return false;
        }

        CachedSessionAuthentication authentication = new CachedSessionAuthentication(
                loaded.getUserId(),
                loaded.getExpiresAt(),
                userGeneration,
                sessionGeneration);
        if (userGeneration == generation(userGenerations, userId)
                && sessionGeneration == generation(sessionGenerations, sessionId)) {
            sessions.put(sessionId, authentication);
        }
        return true;
    }

    public void putActiveAfterCommit(
            Long sessionId,
            Long userId,
            LocalDateTime expiresAt) {
        long userGeneration = generation(userGenerations, userId);
        long sessionGeneration = generation(sessionGenerations, sessionId);
        afterCommit(() -> {
            if (userGeneration == generation(userGenerations, userId)
                    && sessionGeneration == generation(sessionGenerations, sessionId)) {
                sessions.put(sessionId, new CachedSessionAuthentication(
                        userId, expiresAt, userGeneration, sessionGeneration));
            }
        });
    }

    public void evictSessionAfterCommit(Long sessionId) {
        afterCommit(() -> {
            bumpGeneration(sessionGenerations, sessionId);
            sessions.invalidate(sessionId);
        });
    }

    public void evictUserSessionsAfterCommit(Long userId) {
        afterCommit(() -> {
            bumpGeneration(userGenerations, userId);
            sessions.asMap().entrySet().removeIf(
                    entry -> userId.equals(entry.getValue().userId()));
        });
    }

    public void evictOtherSessionsAfterCommit(Long userId, Long currentSessionId) {
        afterCommit(() -> {
            CachedSessionAuthentication current = sessions.getIfPresent(currentSessionId);
            long nextGeneration = bumpGeneration(userGenerations, userId);
            sessions.asMap().entrySet().removeIf(
                    entry -> userId.equals(entry.getValue().userId()));
            if (current != null && current.expiresAt().isAfter(LocalDateTime.now())) {
                sessions.put(currentSessionId, new CachedSessionAuthentication(
                        userId,
                        current.expiresAt(),
                        nextGeneration,
                        generation(sessionGenerations, currentSessionId)));
            }
        });
    }

    private long generation(Cache<Long, Long> generations, Long id) {
        Long value = generations.getIfPresent(id);
        return value == null ? 0 : value;
    }

    private long bumpGeneration(Cache<Long, Long> generations, Long id) {
        return generations.asMap().merge(id, 1L, Long::sum);
    }

    private void afterCommit(Runnable action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            action.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        action.run();
                    }
                });
    }

    private record CachedSessionAuthentication(
            Long userId,
            LocalDateTime expiresAt,
            long userGeneration,
            long sessionGeneration) {

        private boolean matches(
                Long expectedUserId,
                long currentUserGeneration,
                long currentSessionGeneration,
                LocalDateTime now) {
            return userId.equals(expectedUserId)
                    && userGeneration == currentUserGeneration
                    && sessionGeneration == currentSessionGeneration
                    && expiresAt.isAfter(now);
        }
    }
}
