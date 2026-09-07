package com.zh.learnhub_api.services.cache;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class ApplicationCacheInvalidator {

    private final CacheManager cacheManager;
    private final ApplicationEventPublisher eventPublisher;

    public void evictAfterCommit(String cacheName, Object key) {
        eventPublisher.publishEvent(new EvictionRequested(cacheName, key));
    }

    public void clearAfterCommit(String... cacheNames) {
        eventPublisher.publishEvent(new ClearRequested(cacheNames));
    }

    private Cache requireCache(String cacheName) {
        Cache cache = cacheManager.getCache(cacheName);
        if (cache == null) {
            throw new IllegalStateException("Thiếu cache: %s".formatted(cacheName));
        }
        return cache;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onEviction(EvictionRequested event) {
        requireCache(event.cacheName()).evict(event.key());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onClear(ClearRequested event) {
        for (String cacheName : event.cacheNames()) {
            requireCache(cacheName).clear();
        }
    }

    public record EvictionRequested(String cacheName, Object key) {}

    public record ClearRequested(String[] cacheNames) {}
}
