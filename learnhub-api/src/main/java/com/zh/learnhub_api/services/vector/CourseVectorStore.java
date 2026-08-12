package com.zh.learnhub_api.services.vector;

import java.util.List;
import java.util.Set;

public interface CourseVectorStore {

    boolean isEnabled();

    void upsert(Long courseId, List<Float> vector);

    void delete(Long courseId);

    List<CourseVectorMatch> findSimilar(
            Long courseId,
            int limit,
            Set<Long> excludedCourseIds,
            Double scoreThreshold);

    List<CourseVectorMatch> findSimilar(
            List<Float> queryVector,
            int limit,
            Set<Long> excludedCourseIds,
            Double scoreThreshold);
}
