package com.zh.learnhub_api.services.cache;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Component
@RequiredArgsConstructor
public class ApplicationCacheInvalidator {

    private final CacheManager cacheManager;

    public void evictAfterCommit(String cacheName, Object key) {
        afterCommit(() -> requireCache(cacheName).evict(key));
    }

    public void clearAfterCommit(String... cacheNames) {
        afterCommit(() -> {
            for (String cacheName : cacheNames) {
                requireCache(cacheName).clear();
            }
        });
    }

    private Cache requireCache(String cacheName) {
        Cache cache = cacheManager.getCache(cacheName);
        if (cache == null) {
            throw new IllegalStateException("Cache is not registered: " + cacheName);
        }
        return cache;
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
}
