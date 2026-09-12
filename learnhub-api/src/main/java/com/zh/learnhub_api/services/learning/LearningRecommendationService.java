package com.zh.learnhub_api.services.learning;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.dtos.course.RecommendationCardDTO;
import com.zh.learnhub_api.services.vector.CourseVectorStore;
import com.zh.learnhub_api.services.vector.CourseVectorStore.Match;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class LearningRecommendationService {

    private final CourseVectorStore courseVectorStore;
    private final AppProperties.Recommendation recommendationProperties;

    public List<RecommendationCardDTO> getRecommendations(Long currentCourseId, Set<Long> enrolledCourseIds) {
        if (!courseVectorStore.isEnabled()) {
            return List.of();
        }
        return loadVectorRecommendations(currentCourseId, enrolledCourseIds);
    }

    private List<RecommendationCardDTO> loadVectorRecommendations(Long currentCourseId, Set<Long> enrolledCourseIds) {
        Set<Long> qdrantExcludedIds = new HashSet<>(enrolledCourseIds);
        qdrantExcludedIds.add(currentCourseId);

        int resultLimit = recommendationProperties.resultLimit();
        List<Match> matches;
        try {
            matches = courseVectorStore.findSimilar(
                    currentCourseId, resultLimit, qdrantExcludedIds, recommendationProperties.minimumVectorScore());
        } catch (RestClientException ex) {
            log.warn("Course recommendations unavailable: courseId={}", currentCourseId, ex);
            return List.of();
        }
        if (matches.isEmpty()) {
            return List.of();
        }

        List<RecommendationCardDTO> recommendations = new ArrayList<>(resultLimit);
        for (Match match : matches) {
            if (enrolledCourseIds.contains(match.courseId()) || currentCourseId.equals(match.courseId())) {
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
