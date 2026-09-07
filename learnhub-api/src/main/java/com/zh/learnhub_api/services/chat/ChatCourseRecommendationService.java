package com.zh.learnhub_api.services.chat;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.dtos.course.RecommendationCardDTO;
import com.zh.learnhub_api.services.learning.LearningAccessService;
import com.zh.learnhub_api.services.ai.EmbeddingClient;
import com.zh.learnhub_api.services.vector.CourseVectorStore;
import com.zh.learnhub_api.services.vector.CourseVectorStore.Match;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ChatCourseRecommendationService {

    private final EmbeddingClient embeddingClient;
    private final CourseVectorStore vectorStore;
    private final LearningAccessService learningAccessService;
    private final AppProperties.Recommendation recommendationProperties;

    public List<RecommendationCardDTO> recommend(List<String> searchKeywords, Long userId) {
        if (!vectorStore.isEnabled() || searchKeywords.isEmpty()) {
            return List.of();
        }

        Set<Long> enrolledIds = userId == null
                ? Set.of()
                : learningAccessService.getEnrolledCourseIds(userId);
        List<List<Match>> matchesByKeyword = vectorStore.findSimilarBatch(
                embeddingClient.embedQueries(searchKeywords),
                recommendationProperties.resultLimit(),
                enrolledIds,
                recommendationProperties.minimumVectorScore());
        if (matchesByKeyword.isEmpty()) {
            return List.of();
        }

        int courseLimit = recommendationProperties.resultLimit();
        List<RecommendationCardDTO> courses = new ArrayList<>(courseLimit);
        Set<Long> seenCourseIds = new HashSet<>();
        int maximumMatches = matchesByKeyword.stream()
                .mapToInt(List::size)
                .max()
                .orElse(0);
        for (int matchIndex = 0; matchIndex < maximumMatches && courses.size() < courseLimit; matchIndex++) {
            for (List<Match> matches : matchesByKeyword) {
                if (matchIndex >= matches.size()) {
                    continue;
                }
                Match match = matches.get(matchIndex);
                if (enrolledIds.contains(match.courseId()) || !seenCourseIds.add(match.courseId())) {
                    continue;
                }
                courses.add(match.payload().toRecommendationCard());
                if (courses.size() == courseLimit) {
                    break;
                }
            }
        }

        return List.copyOf(courses);
    }
}
