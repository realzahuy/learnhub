package com.zh.learnhub_api.services.course;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.dtos.common.PageResponseDTO;
import com.zh.learnhub_api.dtos.course.CourseListItemDTO;
import com.zh.learnhub_api.dtos.course.PublicCourseDetailDTO;
import com.zh.learnhub_api.dtos.course.PublicLessonDTO;
import com.zh.learnhub_api.dtos.course.PublicLessonDTO.PublicVideoDTO;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.Video;
import com.zh.learnhub_api.projections.course.CourseListProjection;
import com.zh.learnhub_api.projections.course.PublicCourseDetailProjection;
import com.zh.learnhub_api.projections.course.RatedCourseListProjection;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import com.zh.learnhub_api.repositories.course.LessonRepository;
import com.zh.learnhub_api.repositories.course.QuestionRepository;
import com.zh.learnhub_api.repositories.media.VideoRepository;
import com.zh.learnhub_api.services.learning.RatingStats;
import com.zh.learnhub_api.services.media.VideoPlaybackUrls;
import com.zh.learnhub_api.services.learning.ReviewService;
import com.zh.learnhub_api.mappers.CourseMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CourseCatalogService {

    private final CourseRepository courseRepository;
    private final LessonRepository lessonRepository;
    private final VideoRepository videoRepository;
    private final QuestionRepository questionRepository;
    private final CourseMapper courseMapper;
    private final ReviewService reviewService;
    private final AppProperties.Recommendation recommendationProperties;

    public PageResponseDTO<CourseListItemDTO> getPublishedCourses(
            String keyword, String categoryName, String sort, Pageable requestedPage) {
        String normalizedKeyword = normalizeFilter(keyword);
        String normalizedCategory = normalizeFilter(categoryName);
        String normalizedSort = sort == null ? "newest" : sort.trim().toLowerCase();

        if ("rating_desc".equals(normalizedSort)) {
            Pageable pageable = PageRequest.of(
                    requestedPage.getPageNumber(), requestedPage.getPageSize());
            double ratingPrior = Math.max(
                    1d, Math.min(5d, recommendationProperties.ratingPrior()));
            double ratingPriorCount = Math.max(
                    0d, recommendationProperties.ratingPriorCount());
            Page<RatedCourseListProjection> coursePage =
                    courseRepository.findPublishedCoursesOrderByRating(
                            normalizedCategory,
                            normalizedKeyword,
                            ratingPrior,
                            ratingPriorCount,
                            pageable);
            List<CourseListItemDTO> content = coursePage.getContent().stream()
                    .map(courseMapper::mapRatedListProjectionToDTO)
                    .collect(Collectors.toList());
            return PageResponseDTO.from(coursePage, content);
        }

        Sort pageSort = switch (normalizedSort) {
            case "oldest" -> Sort.by(Sort.Direction.ASC, "createdAt")
                    .and(Sort.by(Sort.Direction.ASC, "id"));
            case "price_asc" -> Sort.by(Sort.Direction.ASC, "price")
                    .and(Sort.by(Sort.Direction.DESC, "createdAt"));
            case "price_desc" -> Sort.by(Sort.Direction.DESC, "price")
                    .and(Sort.by(Sort.Direction.DESC, "createdAt"));
            default -> Sort.by(Sort.Direction.DESC, "createdAt")
                    .and(Sort.by(Sort.Direction.DESC, "id"));
        };
        Pageable pageable = PageRequest.of(
                requestedPage.getPageNumber(), requestedPage.getPageSize(), pageSort);
        Page<CourseListProjection> coursePage = courseRepository.findPublishedCourses(
                normalizedCategory, normalizedKeyword, pageable);

        List<CourseListItemDTO> content = coursePage.getContent().stream()
                .map(courseMapper::mapListProjectionToDTO)
                .collect(Collectors.toList());
        courseMapper.applyRatings(content, reviewService.getRatingStatsByCourses(
                content.stream().map(CourseListItemDTO::getId).collect(Collectors.toList())));

        return PageResponseDTO.from(coursePage, content);
    }

    private String normalizeFilter(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public PublicCourseDetailDTO getPublishedCourseBySlug(String slug) {
        PublicCourseDetailProjection projection = courseRepository.findPublishedBySlugForPublic(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khóa học"));

        PublicCourseDetailDTO dto = courseMapper.mapPublicDetailProjectionToDTO(projection);
        dto.setLessons(getPublicLessons(dto.getId()));

        dto.setRatingSummary(reviewService.buildSummary(dto.getId()));

        RatingStats instructorRating = reviewService.getInstructorRatingStats(dto.getInstructorId());
        dto.setInstructorAverageRating(instructorRating.average());
        dto.setInstructorReviewCount(instructorRating.reviewCount());
        return dto;
    }

    private List<PublicLessonDTO> getPublicLessons(Long courseId) {
        Map<Long, List<Video>> videosByLesson = videoRepository.findPublicByCourseId(courseId).stream()
                .collect(Collectors.groupingBy(
                        video -> video.getLesson().getId(),
                        LinkedHashMap::new,
                        Collectors.toList()));

        Map<Long, Integer> questionCountByLesson = questionRepository
                .countByCourseGroupedByLesson(courseId).stream()
                .collect(Collectors.toMap(
                        row -> row.getLessonId(),
                        row -> row.getQuestionCount().intValue()));

        return lessonRepository.findByCourseId_IdOrderByPositionAsc(courseId).stream()
                .map(lesson -> new PublicLessonDTO(
                        lesson.getId(),
                        lesson.getTitle(),
                        lesson.getPosition(),
                        lesson.isPreview(),
                        videosByLesson.getOrDefault(lesson.getId(), List.of()).stream()
                                .map(video -> toPublicVideo(video, lesson.isPreview()))
                                .collect(Collectors.toList()),
                        questionCountByLesson.getOrDefault(lesson.getId(), 0)))
                .collect(Collectors.toList());
    }

    private PublicVideoDTO toPublicVideo(Video video, boolean lessonIsPreview) {
        String previewUrl = lessonIsPreview ? VideoPlaybackUrls.preview(video) : null;

        return new PublicVideoDTO(
                video.getId(), video.getTitle(), video.getDurationSeconds(), previewUrl);
    }
}
