package com.zh.learnhub_api.services.learning;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.dtos.course.CourseListItemDTO;
import com.zh.learnhub_api.pojo.Course;
import com.zh.learnhub_api.projections.course.CourseListProjection;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import com.zh.learnhub_api.services.vector.CourseVectorMatch;
import com.zh.learnhub_api.services.vector.CourseVectorStore;
import com.zh.learnhub_api.services.vector.CourseTopicMatcher;
import com.zh.learnhub_api.mappers.CourseMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class LearningRecommendationService {

    private static final int MAX_RECOMMENDATIONS = 6;

    private final CourseRepository courseRepository;
    private final CourseMapper courseMapper;
    private final ReviewService reviewService;
    private final CourseVectorStore courseVectorStore;
    private final AppProperties.Recommendation recommendationProperties;

    public List<CourseListItemDTO> getRecommendations(
            Course currentCourse, Set<Long> enrolledCourseIds) {
        if (!courseVectorStore.isEnabled()) {
            return List.of();
        }
        try {
            return loadVectorRecommendations(currentCourse, enrolledCourseIds);
        } catch (Exception ex) {
            log.warn("Không thể lấy đề xuất AI cho khóa {}: {}",
                    currentCourse.getId(), ex.getMessage());
            return List.of();
        }
    }

    private List<CourseListItemDTO> loadVectorRecommendations(
            Course currentCourse, Set<Long> enrolledCourseIds) {
        Set<Long> qdrantExcludedIds = new HashSet<>(enrolledCourseIds);
        qdrantExcludedIds.add(currentCourse.getId());

        int candidateLimit = Math.max(
                MAX_RECOMMENDATIONS,
                Math.min(recommendationProperties.vectorCandidateLimit(), 100));
        List<CourseVectorMatch> matches = courseVectorStore.findSimilar(
                currentCourse.getId(),
                candidateLimit,
                qdrantExcludedIds,
                Math.max(-1d, Math.min(1d, recommendationProperties.minimumVectorScore())));
        if (matches.isEmpty()) {
            return List.of();
        }

        List<Long> candidateIds = matches.stream()
                .map(CourseVectorMatch::courseId)
                .distinct()
                .collect(Collectors.toList());
        Map<Long, CourseListProjection> projectionById = courseRepository
                .findPublishedRecommendationCoursesByIds(candidateIds).stream()
                .collect(Collectors.toMap(
                        CourseListProjection::getCourseId,
                        projection -> projection));

        Map<Long, Double> vectorScoreByCourse = new HashMap<>();
        List<CourseListItemDTO> candidates = new ArrayList<>();
        for (CourseVectorMatch match : matches) {
            CourseListProjection projection = projectionById.get(match.courseId());
            if (projection == null || enrolledCourseIds.contains(match.courseId())) {
                continue;
            }
            if (!CourseTopicMatcher.hasMeaningfulTopicOverlap(currentCourse, projection)) {
                continue;
            }
            candidates.add(courseMapper.mapListProjectionToDTO(projection));
            vectorScoreByCourse.put(match.courseId(), match.score());
        }
        if (candidates.isEmpty()) {
            return List.of();
        }

        courseMapper.applyRatings(candidates, reviewService.getRatingStatsByCourses(
                candidates.stream().map(CourseListItemDTO::getId).collect(Collectors.toList())));
        candidates.sort(Comparator
                .comparingDouble((CourseListItemDTO candidate) -> finalRecommendationScore(
                        vectorScoreByCourse.getOrDefault(candidate.getId(), -1d), candidate))
                .reversed()
                .thenComparing(Comparator.comparingLong(
                        CourseListItemDTO::getReviewCount).reversed()));

        String currentTitle = normalizeTitle(currentCourse.getTitle());
        Map<String, CourseListItemDTO> distinctTitles = new LinkedHashMap<>();
        for (CourseListItemDTO candidate : candidates) {
            String title = normalizeTitle(candidate.getTitle());
            if (!title.equals(currentTitle)) {
                distinctTitles.putIfAbsent(title, candidate);
            }
            if (distinctTitles.size() == MAX_RECOMMENDATIONS) {
                break;
            }
        }
        return List.copyOf(distinctTitles.values());
    }

    private double finalRecommendationScore(double cosineScore, CourseListItemDTO candidate) {
        double normalizedSemantic = Math.max(0d, Math.min(1d, (cosineScore + 1d) / 2d));
        double count = Math.max(0d, candidate.getReviewCount());
        double priorCount = Math.max(0d, recommendationProperties.ratingPriorCount());
        double prior = Math.max(1d, Math.min(5d, recommendationProperties.ratingPrior()));
        double bayesianRating = count + priorCount == 0d
                ? prior
                : (count * candidate.getAverageRating() + priorCount * prior)
                        / (count + priorCount);
        double normalizedRating = bayesianRating / 5d;
        double weight = Math.max(0d, Math.min(1d, recommendationProperties.semanticWeight()));
        return weight * normalizedSemantic + (1d - weight) * normalizedRating;
    }

    private String normalizeTitle(String title) {
        return title == null
                ? ""
                : title.toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]", "");
    }
}
