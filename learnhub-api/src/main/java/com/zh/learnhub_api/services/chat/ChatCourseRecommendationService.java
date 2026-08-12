package com.zh.learnhub_api.services.chat;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.dtos.course.CourseListItemDTO;
import com.zh.learnhub_api.projections.course.CourseListProjection;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import com.zh.learnhub_api.repositories.learning.EnrollmentRepository;
import com.zh.learnhub_api.services.ai.EmbeddingClient;
import com.zh.learnhub_api.services.vector.CourseVectorMatch;
import com.zh.learnhub_api.services.vector.CourseVectorStore;
import com.zh.learnhub_api.services.vector.CourseTopicMatcher;
import com.zh.learnhub_api.services.learning.ReviewService;
import com.zh.learnhub_api.mappers.CourseMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatCourseRecommendationService {

    private static final Pattern DIACRITICS = Pattern.compile("\\p{M}+");
    private static final Pattern NON_WORD = Pattern.compile("[^a-z0-9]+", Pattern.CASE_INSENSITIVE);
    private final EmbeddingClient embeddingClient;
    private final CourseVectorStore vectorStore;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final CourseMapper courseMapper;
    private final ReviewService reviewService;
    private final AppProperties.Chat chatProperties;

    @Transactional(readOnly = true)
    public List<CourseListItemDTO> recommend(List<String> searchKeywords, String username) {
        List<String> keywords = sanitizeKeywords(searchKeywords);
        if (!vectorStore.isEnabled() || keywords.isEmpty()) {
            return List.of();
        }

        try {
            Set<Long> enrolledIds = username == null || username.isBlank()
                    ? Set.of()
                    : enrollmentRepository.findCourseIdsByUsername(username);
            int safeCandidateLimit = Math.max(1, Math.min(chatProperties.vectorCandidateLimit(), 100));
            double safeMinimumScore = Math.max(-1d, Math.min(1d, chatProperties.minimumVectorScore()));
            List<CourseVectorMatch> matches = vectorStore.findSimilar(
                    embeddingClient.embedQuery(buildVectorQuery(keywords)), safeCandidateLimit, enrolledIds,
                    safeMinimumScore);
            if (matches.isEmpty()) {
                return List.of();
            }

            List<Long> ids = matches.stream()
                    .map(CourseVectorMatch::courseId)
                    .distinct()
                    .toList();
            Map<Long, CourseListProjection> projectionById = courseRepository
                    .findPublishedRecommendationCoursesByIds(ids).stream()
                    .collect(Collectors.toMap(
                            CourseListProjection::getCourseId,
                            Function.identity()));

            int safeCourseLimit = Math.max(1, Math.min(chatProperties.courseLimit(), 8));
            List<CourseListItemDTO> courses = new ArrayList<>(safeCourseLimit);
            Map<String, Boolean> seenTitles = new LinkedHashMap<>();
            for (CourseVectorMatch match : matches) {
                if (enrolledIds.contains(match.courseId())) {
                    continue;
                }
                CourseListProjection projection = projectionById.get(match.courseId());
                if (projection == null) {
                    continue;
                }
                if (!CourseTopicMatcher.matchesKeywords(projection, keywords)) {
                    continue;
                }
                CourseListItemDTO course = courseMapper.mapListProjectionToDTO(projection);
                String titleKey = normalize(course.getTitle());
                if (seenTitles.putIfAbsent(titleKey, Boolean.TRUE) == null) {
                    courses.add(course);
                }
                if (courses.size() == safeCourseLimit) {
                    break;
                }
            }

            if (courses.isEmpty()) {
                return List.of();
            }
            courseMapper.applyRatings(courses, reviewService.getRatingStatsByCourses(
                    courses.stream().map(CourseListItemDTO::getId).toList()));
            return List.copyOf(courses);
        } catch (Exception ex) {
            log.warn("Không thể lấy khóa học cho chatbot, bỏ qua phần gợi ý: {}", ex.getMessage());
            return List.of();
        }
    }

    private String normalize(String value) {
        String decomposed = Normalizer.normalize(value, Normalizer.Form.NFD);
        String withoutMarks = DIACRITICS.matcher(decomposed).replaceAll("")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .toLowerCase(Locale.ROOT);
        return NON_WORD.matcher(withoutMarks).replaceAll(" ").trim();
    }

    private List<String> sanitizeKeywords(List<String> values) {
        if (values == null) {
            return List.of();
        }
        return values.stream()
                .filter(value -> value != null && !value.isBlank())
                .map(String::trim)
                .distinct()
                .limit(8)
                .toList();
    }

    private String buildVectorQuery(List<String> keywords) {
        return "Tìm khóa học dạy đúng các chủ đề và kỹ năng sau:\n- "
                + String.join("\n- ", keywords);
    }

}
