package com.zh.learnhub_api.configs;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.Collections;

@Configuration(proxyBeanMethods = false)
public class CacheConfiguration {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager();
        manager.setAllowNullValues(false);
        manager.setCacheNames(Collections.emptyList());

        register(manager, CacheNames.ROLE_IDS, 32, Duration.ofHours(24));
        register(manager, CacheNames.CATEGORIES, 4, Duration.ofHours(12));
        register(manager, CacheNames.ADMIN_OVERVIEW, 2, Duration.ofMinutes(1));
        register(manager, CacheNames.ADMIN_TIME_SERIES, 256, Duration.ofMinutes(2));
        register(manager, CacheNames.INSTRUCTOR_OVERVIEW, 2_000, Duration.ofMinutes(1));
        register(manager, CacheNames.INSTRUCTOR_TIME_SERIES, 4_000, Duration.ofMinutes(2));
        register(manager, CacheNames.QUERY_EMBEDDINGS, 500, Duration.ofHours(24));
        register(manager, CacheNames.COURSE_RATING_STATS, 10_000, Duration.ofMinutes(30));
        register(manager, CacheNames.COURSE_RATING_SUMMARIES, 10_000, Duration.ofMinutes(30));
        register(manager, CacheNames.INSTRUCTOR_RATING_STATS, 5_000, Duration.ofMinutes(30));
        register(manager, CacheNames.PUBLIC_COURSE_DETAILS, 2_000, Duration.ofHours(2));
        register(manager, CacheNames.PUBLIC_INSTRUCTOR_PROFILES, 2_000, Duration.ofMinutes(30));
        register(manager, CacheNames.PUBLIC_COURSE_CATALOG, 32, Duration.ofMinutes(1));
        return manager;
    }

    private void register(
            CaffeineCacheManager manager,
            String name,
            long maximumSize,
            Duration ttl) {
        manager.registerCustomCache(name, Caffeine.newBuilder()
                .maximumSize(maximumSize)
                .expireAfterWrite(ttl)
                .build());
    }
}
