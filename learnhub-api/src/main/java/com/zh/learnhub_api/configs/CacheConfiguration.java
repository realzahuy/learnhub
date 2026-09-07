package com.zh.learnhub_api.configs;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Collections;

@Configuration(proxyBeanMethods = false)
public class CacheConfiguration {

    public static final String CATEGORIES = "categories";
    public static final String COURSE_RATING_STATS = "courseRatingStats";
    public static final String COURSE_RATING_SUMMARIES = "courseRatingSummaries";
    public static final String PUBLIC_COURSE_DETAILS = "publicCourseDetails";
    public static final String PUBLIC_COURSE_CATALOG = "publicCourseCatalog";

    @Bean
    public CacheManager cacheManager(AppProperties.ApplicationCache applicationCache) {
        CaffeineCacheManager manager = new CaffeineCacheManager();
        manager.setAllowNullValues(false);
        manager.setCacheNames(Collections.emptyList());

        register(manager, CATEGORIES, applicationCache.categories());
        register(manager, COURSE_RATING_STATS, applicationCache.courseRatingStats());
        register(manager, COURSE_RATING_SUMMARIES, applicationCache.courseRatingSummaries());
        register(manager, PUBLIC_COURSE_DETAILS, applicationCache.publicCourseDetails());
        register(manager, PUBLIC_COURSE_CATALOG, applicationCache.publicCourseCatalog());
        return manager;
    }

    private void register(CaffeineCacheManager manager, String name, AppProperties.CacheSpec spec) {
        manager.registerCustomCache(
                name,
                Caffeine.newBuilder()
                        .maximumSize(spec.maximumSize())
                        .expireAfterWrite(spec.expireAfterWrite())
                        .build());
    }
}
