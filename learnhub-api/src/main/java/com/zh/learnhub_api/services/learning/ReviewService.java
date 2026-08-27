package com.zh.learnhub_api.services.learning;

import com.zh.learnhub_api.configs.CacheConfiguration;
import com.zh.learnhub_api.dtos.common.PageResponseDTO;
import com.zh.learnhub_api.dtos.learning.RatingSummaryDTO;
import com.zh.learnhub_api.dtos.learning.ReviewRequestDTO;
import com.zh.learnhub_api.dtos.learning.ReviewResponseDTO;
import com.zh.learnhub_api.exceptions.ForbiddenException;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.CourseReview;
import com.zh.learnhub_api.pojo.User;
import com.zh.learnhub_api.projections.review.ReviewListProjection;
import com.zh.learnhub_api.repositories.account.UserRepository;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import com.zh.learnhub_api.repositories.learning.CourseReviewRepository;
import com.zh.learnhub_api.repositories.learning.EnrollmentRepository;
import com.zh.learnhub_api.services.cache.ApplicationCacheInvalidator;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReviewService {

    private final CourseReviewRepository reviewRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;
    private final RatingCacheService ratingCacheService;
    private final ApplicationCacheInvalidator cacheInvalidator;

    @Transactional
    public ReviewResponseDTO saveReview(String slug, Long userId, ReviewRequestDTO request) {
        Long courseId = findPublishedCourseId(slug);

        if (!enrollmentRepository.existsByUserId_IdAndCourseId_Id(userId, courseId)) {
            throw new ForbiddenException("Bạn cần ghi danh khóa học trước khi đánh giá");
        }

        CourseReview review = reviewRepository
            .findByUserId_IdAndCourseId_Id(userId, courseId)
            .orElseGet(() -> {
                CourseReview fresh = new CourseReview();
                fresh.setCourseId(courseRepository.getReferenceById(courseId));
                fresh.setUserId(userRepository.getReferenceById(userId));
                return fresh;
            });

        review.setRating(request.getRating());
        review.setComment(normalizeComment(request.getComment()));

        ReviewResponseDTO response = toDTO(reviewRepository.save(review), userId);
        invalidateRatingCaches(courseId);
        return response;
    }

    @Transactional
    public void deleteMyReview(String slug, Long userId) {
        Long courseId = findPublishedCourseId(slug);

        CourseReview review = reviewRepository
            .findByUserId_IdAndCourseId_Id(userId, courseId)
            .orElseThrow(() -> new ResourceNotFoundException("Bạn chưa đánh giá khóa học này"));

        reviewRepository.delete(review);
        invalidateRatingCaches(courseId);
    }

    public ReviewResponseDTO getMyReview(String slug, Long userId) {
        Long courseId = findPublishedCourseId(slug);

        return reviewRepository.findByUserId_IdAndCourseId_Id(userId, courseId)
            .map(review -> toDTO(review, userId))
            .orElse(null);
    }

    public PageResponseDTO<ReviewResponseDTO> getCourseReviews(
            String slug, Long currentUserId, Pageable requestedPage) {

        Long courseId = findPublishedCourseId(slug);

        Pageable pageable = PageRequest.of(
                requestedPage.getPageNumber(), requestedPage.getPageSize());
        Page<ReviewListProjection> reviewPage = reviewRepository.findListByCourse(courseId, pageable);

        return PageResponseDTO.from(reviewPage.map(review -> toDTO(review, currentUserId)));
    }

    public RatingSummaryDTO getCourseSummary(String slug) {
        return buildSummary(findPublishedCourseId(slug));
    }

    public RatingSummaryDTO buildSummary(Long courseId) {
        return ratingCacheService.getCourseSummary(courseId);
    }

    public Map<Long, RatingStats> getRatingStatsByCourses(List<Long> courseIds) {
        return ratingCacheService.getCourseStats(courseIds);
    }

    public RatingStats getInstructorRatingStats(Long instructorId) {
        return ratingCacheService.getInstructorStats(instructorId);
    }

    private void invalidateRatingCaches(Long courseId) {
        cacheInvalidator.evictAfterCommit(CacheConfiguration.COURSE_RATING_STATS, courseId);
        cacheInvalidator.evictAfterCommit(CacheConfiguration.COURSE_RATING_SUMMARIES, courseId);
    }

    private Long findPublishedCourseId(String slug) {
        return courseRepository.findPublishedIdBySlug(slug)
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khóa học"));
    }

    private String normalizeComment(String comment) {
        if (comment == null) {
            return null;
        }
        String trimmed = comment.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private ReviewResponseDTO toDTO(CourseReview review, Long currentUserId) {
        User author = review.getUserId();
        return new ReviewResponseDTO(
            review.getId(),
            review.getRating(),
            review.getComment(),
            author.getId(),
            author.getFullName(),
            author.getAvatar(),
            review.getCreatedAt(),
            review.getUpdatedAt(),
            currentUserId != null && currentUserId.equals(author.getId())
        );
    }

    private ReviewResponseDTO toDTO(ReviewListProjection review, Long currentUserId) {
        return new ReviewResponseDTO(
            review.getId(),
            review.getRating(),
            review.getComment(),
            review.getUserId(),
            review.getUserFullName(),
            review.getUserAvatar(),
            review.getCreatedAt(),
            review.getUpdatedAt(),
            currentUserId != null && currentUserId.equals(review.getUserId())
        );
    }
}
