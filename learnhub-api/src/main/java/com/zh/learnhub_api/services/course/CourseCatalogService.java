package com.zh.learnhub_api.services.course;

import com.zh.learnhub_api.configs.CacheConfiguration;
import com.zh.learnhub_api.dtos.common.PageResponseDTO;
import com.zh.learnhub_api.dtos.course.CourseListItemDTO;
import com.zh.learnhub_api.dtos.course.PublicCourseDetailDTO;
import com.zh.learnhub_api.mappers.CourseMapper;
import com.zh.learnhub_api.projections.course.CourseListProjection;
import com.zh.learnhub_api.projections.course.RatedCourseListProjection;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import com.zh.learnhub_api.services.learning.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CourseCatalogService {

    private final CourseRepository courseRepository;
    private final CourseMapper courseMapper;
    private final ReviewService reviewService;
    private final PublicCourseDetailCacheService publicCourseDetailCacheService;

    @Cacheable(
            cacheNames = CacheConfiguration.PUBLIC_COURSE_CATALOG,
            key = "#requestedPage.pageSize",
            condition = "#requestedPage.pageNumber == 0 "
                    + "&& (#keyword == null || #keyword.isBlank()) "
                    + "&& (#categoryName == null || #categoryName.isBlank()) "
                    + "&& (#sort == null || #sort.isBlank() "
                    + "|| #sort.trim().equalsIgnoreCase('newest'))",
            sync = true)
    public PageResponseDTO<CourseListItemDTO> getPublishedCourses(
            String keyword, String categoryName, String sort, Pageable requestedPage) {
        String normalizedKeyword = normalizeFilter(keyword);
        String normalizedCategory = normalizeFilter(categoryName);
        String normalizedSort = sort == null ? "newest" : sort.trim().toLowerCase();

        if ("rating_desc".equals(normalizedSort)) {
            Pageable pageable = PageRequest.of(requestedPage.getPageNumber(), requestedPage.getPageSize());
            Page<RatedCourseListProjection> coursePage = courseRepository.findPublishedCoursesOrderByRating(
                    normalizedCategory,
                    normalizedKeyword,
                    pageable);
            List<CourseListItemDTO> content = coursePage.getContent().stream()
                    .map(courseMapper::mapRatedListProjectionToDTO)
                    .toList();
            return PageResponseDTO.from(coursePage, content);
        }

        Sort pageSort =
                switch (normalizedSort) {
                    case "oldest" -> Sort.by(Sort.Direction.ASC, "createdAt").and(Sort.by(Sort.Direction.ASC, "id"));
                    case "price_asc" ->
                        Sort.by(Sort.Direction.ASC, "price").and(Sort.by(Sort.Direction.DESC, "createdAt"));
                    case "price_desc" ->
                        Sort.by(Sort.Direction.DESC, "price").and(Sort.by(Sort.Direction.DESC, "createdAt"));
                    default -> Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"));
                };
        Pageable pageable = PageRequest.of(requestedPage.getPageNumber(), requestedPage.getPageSize(), pageSort);
        Page<CourseListProjection> coursePage =
                courseRepository.findPublishedCourses(normalizedCategory, normalizedKeyword, pageable);

        List<CourseListItemDTO> content = coursePage.getContent().stream()
                .map(courseMapper::mapListProjectionToDTO)
                .toList();
        courseMapper.applyRatings(
                content,
                reviewService.getRatingStatsByCourses(
                        content.stream().map(CourseListItemDTO::getId).toList()));

        return PageResponseDTO.from(coursePage, content);
    }

    private String normalizeFilter(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public PublicCourseDetailDTO getPublishedCourseBySlug(String slug) {
        PublicCourseDetailDTO cached = publicCourseDetailCacheService.getStaticDetail(slug);

        return new PublicCourseDetailDTO(
                cached.getId(),
                cached.getTitle(),
                cached.getSlug(),
                cached.getShortDescription(),
                cached.getDescription(),
                cached.getThumbnail(),
                cached.getPrice(),
                cached.getInstructorId(),
                cached.getInstructorName(),
                cached.getInstructorAvatar(),
                cached.getCategoryName(),
                cached.getLessons(),
                reviewService.buildSummary(cached.getId()));
    }
}
