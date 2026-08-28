package com.zh.learnhub_api.services.vector;

import com.zh.learnhub_api.dtos.course.RecommendationCardDTO;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

public interface CourseVectorStore {

    boolean isEnabled();

    void upsert(Long courseId, List<Float> vector, Payload payload);

    void updatePayload(Long courseId, Payload payload);

    void delete(Long courseId);

    List<Match> findSimilar(Long courseId, int limit, Set<Long> excludedCourseIds, double scoreThreshold);

    List<Match> findSimilar(List<Float> queryVector, int limit, Set<Long> excludedCourseIds, double scoreThreshold);

    record Payload(String slug, String title, String thumbnail, BigDecimal price) {

        public RecommendationCardDTO toRecommendationCard() {
            return new RecommendationCardDTO(slug, title, thumbnail, price);
        }
    }

    record Match(Long courseId, Payload payload) {}
}
