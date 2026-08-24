package com.zh.learnhub_api.services.chat;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.dtos.course.RecommendationCardDTO;
import com.zh.learnhub_api.repositories.learning.EnrollmentRepository;
import com.zh.learnhub_api.services.ai.EmbeddingClient;
import com.zh.learnhub_api.services.vector.CourseVectorStore;
import com.zh.learnhub_api.services.vector.CourseVectorStore.Match;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ChatCourseRecommendationService {

    private final EmbeddingClient embeddingClient;
    private final CourseVectorStore vectorStore;
    private final EnrollmentRepository enrollmentRepository;
    private final AppProperties.VectorSearch vectorSearchProperties;
    private final AppProperties.Chat chatProperties;

    @Transactional(readOnly = true)
    public List<RecommendationCardDTO> recommend(
            List<String> searchKeywords, String username) {
        if (!vectorStore.isEnabled() || searchKeywords.isEmpty()) {
            return List.of();
        }

        try {
            Set<Long> enrolledIds = username == null || username.isBlank()
                    ? Set.of()
                    : enrollmentRepository.findCourseIdsByUsername(username);
            List<Match> matches = vectorStore.findSimilar(
                    embeddingClient.embedQuery(buildVectorQuery(searchKeywords)),
                    vectorSearchProperties.candidateLimit(),
                    enrolledIds,
                    chatProperties.minimumVectorScore());
            if (matches.isEmpty()) {
                return List.of();
            }

            int courseLimit = Math.min(chatProperties.courseLimit(), 8);
            List<RecommendationCardDTO> courses = new ArrayList<>(courseLimit);
            for (Match match : matches) {
                if (enrolledIds.contains(match.courseId())) {
                    continue;
                }
                courses.add(match.payload().toRecommendationCard());
                if (courses.size() == courseLimit) {
                    break;
                }
            }

            return List.copyOf(courses);
        } catch (Exception ex) {
            return List.of();
        }
    }

    private String buildVectorQuery(List<String> keywords) {
        // The planner guarantees that the first item is the canonical topic.
        // Embedding subtopics together can dilute that topic and make equivalent
        // requests produce different Qdrant scores.
        return keywords.get(0);
    }

}
