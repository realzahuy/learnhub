package com.zh.learnhub_api.services.learning;

import com.zh.learnhub_api.configs.CacheNames;
import com.zh.learnhub_api.dtos.learning.RatingSummaryDTO;
import com.zh.learnhub_api.projections.review.RatingStatsProjection;
import com.zh.learnhub_api.repositories.learning.CourseReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RatingCacheService {

    private final CourseReviewRepository reviewRepository;
    private final CacheManager cacheManager;

    @Cacheable(
            cacheNames = CacheNames.COURSE_RATING_SUMMARIES,
            key = "#courseId",
            sync = true)
    public RatingSummaryDTO getCourseSummary(Long courseId) {
        Map<Integer, Long> distribution = new LinkedHashMap<>();
        for (int star = 5; star >= 1; star--) {
            distribution.put(star, 0L);
        }

        long totalReviews = 0L;
        long ratingSum = 0L;
        for (var row : reviewRepository.countByRatingForCourse(courseId)) {
            long count = row.getReviewCount();
            distribution.put(row.getRating(), count);
            totalReviews += count;
            ratingSum += (long) row.getRating() * count;
        }

        double average = totalReviews == 0L
                ? 0d
                : round1((double) ratingSum / totalReviews);
        return new RatingSummaryDTO(
                average,
                totalReviews,
                Collections.unmodifiableMap(new LinkedHashMap<>(distribution)));
    }

    public Map<Long, RatingStats> getCourseStats(List<Long> courseIds) {
        if (courseIds == null || courseIds.isEmpty()) {
            return Map.of();
        }

        List<Long> uniqueIds = new ArrayList<>(new LinkedHashSet<>(courseIds));
        Cache cache = requireCache(CacheNames.COURSE_RATING_STATS);
        Map<Long, RatingStats> result = new HashMap<>();
        List<Long> misses = new ArrayList<>();

        for (Long courseId : uniqueIds) {
            RatingStats cached = cache.get(courseId, RatingStats.class);
            if (cached == null) {
                misses.add(courseId);
            } else {
                result.put(courseId, cached);
            }
        }

        if (!misses.isEmpty()) {
            Map<Long, RatingStats> loaded = new HashMap<>();
            for (var row : reviewRepository.findRatingStatsByCourses(misses)) {
                double average = row.getAverageRating() == null
                        ? 0d : round1(row.getAverageRating());
                long count = row.getReviewCount() == null ? 0L : row.getReviewCount();
                loaded.put(row.getCourseId(), new RatingStats(average, count));
            }
            for (Long courseId : misses) {
                RatingStats stats = loaded.getOrDefault(courseId, RatingStats.empty());
                cache.put(courseId, stats);
                result.put(courseId, stats);
            }
        }

        return Map.copyOf(result);
    }

    @Cacheable(
            cacheNames = CacheNames.INSTRUCTOR_RATING_STATS,
            key = "#instructorId",
            sync = true)
    public RatingStats getInstructorStats(Long instructorId) {
        return readStats(reviewRepository.findRatingStatsByInstructor(instructorId));
    }

    private RatingStats readStats(List<RatingStatsProjection> rows) {
        if (rows.isEmpty()) {
            return RatingStats.empty();
        }
        RatingStatsProjection row = rows.getFirst();
        double average = row.getAverageRating() == null ? 0d : round1(row.getAverageRating());
        long count = row.getReviewCount() == null ? 0L : row.getReviewCount();
        return new RatingStats(average, count);
    }

    private Cache requireCache(String cacheName) {
        Cache cache = cacheManager.getCache(cacheName);
        if (cache == null) {
            throw new IllegalStateException("Cache is not registered: " + cacheName);
        }
        return cache;
    }

    private double round1(double value) {
        return Math.round(value * 10d) / 10d;
    }
}
