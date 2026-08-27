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

    public static final String CATEGORIES = "categories";
    public static final String COURSE_RATING_STATS = "courseRatingStats";
    public static final String COURSE_RATING_SUMMARIES = "courseRatingSummaries";
    public static final String PUBLIC_COURSE_DETAILS = "publicCourseDetails";
    public static final String PUBLIC_COURSE_CATALOG = "publicCourseCatalog";
    public static final String PUBLISHED_VIDEO_PLAYBACK = "publishedVideoPlayback";
    public static final String COURSE_PLAYBACK_ACCESS = "coursePlaybackAccess";

    @Bean
    public CacheManager cacheManager(
            AppProperties.ApplicationCache applicationCache, AppProperties.VideoPlaybackCache videoPlaybackCache) {
        CaffeineCacheManager manager = new CaffeineCacheManager();
        manager.setAllowNullValues(false);
        manager.setCacheNames(Collections.emptyList());

        register(manager, CATEGORIES, applicationCache.categories());
        register(manager, COURSE_RATING_STATS, applicationCache.courseRatingStats());
        register(manager, COURSE_RATING_SUMMARIES, applicationCache.courseRatingSummaries());
        register(manager, PUBLIC_COURSE_DETAILS, applicationCache.publicCourseDetails());
        register(manager, PUBLIC_COURSE_CATALOG, applicationCache.publicCourseCatalog());
        register(
                manager,
                PUBLISHED_VIDEO_PLAYBACK,
                videoPlaybackCache.metadataMaximumSize(),
                Duration.ofMinutes(videoPlaybackCache.metadataExpireAfterWriteMinutes()));
        register(
                manager,
                COURSE_PLAYBACK_ACCESS,
                videoPlaybackCache.accessMaximumSize(),
                Duration.ofMinutes(videoPlaybackCache.accessExpireAfterWriteMinutes()));
        return manager;
    }

    private void register(CaffeineCacheManager manager, String name, AppProperties.CacheSpec spec) {
        register(manager, name, spec.maximumSize(), spec.expireAfterWrite());
    }

    private void register(CaffeineCacheManager manager, String name, long maximumSize, Duration ttl) {
        manager.registerCustomCache(
                name,
                Caffeine.newBuilder()
                        .maximumSize(maximumSize)
                        .expireAfterWrite(ttl)
                        .build());
    }
}
