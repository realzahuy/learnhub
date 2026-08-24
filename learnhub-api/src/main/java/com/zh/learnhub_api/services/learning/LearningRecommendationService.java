package com.zh.learnhub_api.services.learning;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.dtos.course.RecommendationCardDTO;
import com.zh.learnhub_api.services.vector.CourseVectorStore;
import com.zh.learnhub_api.services.vector.CourseVectorStore.Match;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LearningRecommendationService {

    private final CourseVectorStore courseVectorStore;
    private final AppProperties.VectorSearch vectorSearchProperties;
    private final AppProperties.Recommendation recommendationProperties;

    public List<RecommendationCardDTO> getRecommendations(
            Long currentCourseId, Set<Long> enrolledCourseIds) {
        if (!courseVectorStore.isEnabled()) {
            return List.of();
        }
        try {
            return loadVectorRecommendations(currentCourseId, enrolledCourseIds);
        } catch (Exception ex) {
            return List.of();
        }
    }

    private List<RecommendationCardDTO> loadVectorRecommendations(
            Long currentCourseId, Set<Long> enrolledCourseIds) {
        Set<Long> qdrantExcludedIds = new HashSet<>(enrolledCourseIds);
        qdrantExcludedIds.add(currentCourseId);

        int resultLimit = recommendationProperties.resultLimit();
        int candidateLimit = Math.max(resultLimit, vectorSearchProperties.candidateLimit());
        List<Match> matches = courseVectorStore.findSimilar(
                currentCourseId,
                candidateLimit,
                qdrantExcludedIds,
                recommendationProperties.minimumVectorScore());
        if (matches.isEmpty()) {
            return List.of();
        }

        List<RecommendationCardDTO> recommendations = new ArrayList<>(resultLimit);
        for (Match match : matches) {
            if (enrolledCourseIds.contains(match.courseId())
                    || currentCourseId.equals(match.courseId())) {
                continue;
            }
            recommendations.add(match.payload().toRecommendationCard());
            if (recommendations.size() == resultLimit) {
                break;
            }
        }
        return List.copyOf(recommendations);
    }
}
