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
    public CacheManager cacheManager(
            AppProperties.ApplicationCache applicationCache,
            AppProperties.VideoPlaybackCache videoPlaybackCache) {
        CaffeineCacheManager manager = new CaffeineCacheManager();
        manager.setAllowNullValues(false);
        manager.setCacheNames(Collections.emptyList());

        register(manager, CacheNames.ROLE_IDS, applicationCache.roleIds());
        register(manager, CacheNames.CATEGORIES, applicationCache.categories());
        register(manager, CacheNames.ADMIN_OVERVIEW, applicationCache.adminOverview());
        register(manager, CacheNames.ADMIN_TIME_SERIES, applicationCache.adminTimeSeries());
        register(manager, CacheNames.INSTRUCTOR_OVERVIEW, applicationCache.instructorOverview());
        register(manager, CacheNames.INSTRUCTOR_TIME_SERIES, applicationCache.instructorTimeSeries());
        register(manager, CacheNames.QUERY_EMBEDDINGS, applicationCache.queryEmbeddings());
        register(manager, CacheNames.COURSE_RATING_STATS, applicationCache.courseRatingStats());
        register(manager, CacheNames.COURSE_RATING_SUMMARIES, applicationCache.courseRatingSummaries());
        register(manager, CacheNames.INSTRUCTOR_RATING_STATS, applicationCache.instructorRatingStats());
        register(manager, CacheNames.PUBLIC_COURSE_DETAILS, applicationCache.publicCourseDetails());
        register(
                manager,
                CacheNames.PUBLIC_INSTRUCTOR_PROFILES,
                applicationCache.publicInstructorProfiles());
        register(manager, CacheNames.PUBLIC_COURSE_CATALOG, applicationCache.publicCourseCatalog());
        register(
                manager,
                CacheNames.PUBLISHED_VIDEO_PLAYBACK,
                videoPlaybackCache.metadataMaximumSize(),
                Duration.ofMinutes(videoPlaybackCache.metadataExpireAfterWriteMinutes()));
        register(
                manager,
                CacheNames.COURSE_PLAYBACK_ACCESS,
                videoPlaybackCache.accessMaximumSize(),
                Duration.ofMinutes(videoPlaybackCache.accessExpireAfterWriteMinutes()));
        return manager;
    }

    private void register(
            CaffeineCacheManager manager,
            String name,
            AppProperties.CacheSpec spec) {
        register(manager, name, spec.maximumSize(), spec.expireAfterWrite());
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
