package com.zh.learnhub_api.services.learning;

import com.zh.learnhub_api.dtos.common.PageResponseDTO;
import com.zh.learnhub_api.dtos.learning.RatingSummaryDTO;
import com.zh.learnhub_api.dtos.learning.ReviewRequestDTO;
import com.zh.learnhub_api.dtos.learning.ReviewResponseDTO;
import com.zh.learnhub_api.enums.CourseStatus;
import com.zh.learnhub_api.exceptions.ForbiddenException;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.Course;
import com.zh.learnhub_api.pojo.CourseReview;
import com.zh.learnhub_api.pojo.User;
import com.zh.learnhub_api.projections.review.RatingStatsProjection;
import com.zh.learnhub_api.projections.review.ReviewListProjection;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import com.zh.learnhub_api.repositories.learning.CourseReviewRepository;
import com.zh.learnhub_api.repositories.learning.EnrollmentRepository;
import com.zh.learnhub_api.repositories.account.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.LinkedHashMap;
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

    @Transactional
    public ReviewResponseDTO saveReview(String slug, Long userId, ReviewRequestDTO request) {
        Course course = findPublishedCourse(slug);

        if (!enrollmentRepository.existsByUserId_IdAndCourseId_Id(userId, course.getId())) {
            throw new ForbiddenException("Bạn cần ghi danh khóa học trước khi đánh giá");
        }

        CourseReview review = reviewRepository
            .findByUserId_IdAndCourseId_Id(userId, course.getId())
            .orElseGet(() -> {
                CourseReview fresh = new CourseReview();
                fresh.setCourseId(course);
                fresh.setUserId(userRepository.getReferenceById(userId));
                return fresh;
            });

        review.setRating(request.getRating());
        review.setComment(normalizeComment(request.getComment()));

        return toDTO(reviewRepository.save(review), userId);
    }

    @Transactional
    public void deleteMyReview(String slug, Long userId) {
        Course course = findPublishedCourse(slug);

        CourseReview review = reviewRepository
            .findByUserId_IdAndCourseId_Id(userId, course.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Bạn chưa đánh giá khóa học này"));

        reviewRepository.delete(review);
    }

    public ReviewResponseDTO getMyReview(String slug, Long userId) {
        Course course = findPublishedCourse(slug);

        return reviewRepository.findByUserId_IdAndCourseId_Id(userId, course.getId())
            .map(review -> toDTO(review, userId))
            .orElse(null);
    }

    public PageResponseDTO<ReviewResponseDTO> getCourseReviews(
            String slug, Long currentUserId, Pageable requestedPage) {

        Course course = findPublishedCourse(slug);

        Pageable pageable = PageRequest.of(
                requestedPage.getPageNumber(), requestedPage.getPageSize());
        Page<ReviewListProjection> reviewPage = reviewRepository.findListByCourse(
                course.getId(), pageable);

        return PageResponseDTO.from(reviewPage.map(review -> toDTO(review, currentUserId)));
    }

    public RatingSummaryDTO getCourseSummary(String slug) {
        Course course = findPublishedCourse(slug);
        return buildSummary(course.getId());
    }

    public RatingSummaryDTO buildSummary(Long courseId) {

        Map<Integer, Long> distribution = new LinkedHashMap<>();
        for (int star = 5; star >= 1; star--) {
            distribution.put(star, 0L);
        }
        long totalReviews = 0L;
        long ratingSum = 0L;
        for (var row : reviewRepository.countByRatingForCourse(courseId)) {
            long count = row.getReviewCount();
            distribution.put(row.getRating(), count);
            totalReviews += count;
            ratingSum += (long) row.getRating() * count;
        }

        double average = totalReviews == 0L
                ? 0d
                : round1((double) ratingSum / totalReviews);
        return new RatingSummaryDTO(average, totalReviews, distribution);
    }

    public Map<Long, RatingStats> getRatingStatsByCourses(List<Long> courseIds) {
        if (courseIds == null || courseIds.isEmpty()) {
            return Map.of();
        }

        Map<Long, RatingStats> statsByCourse = new HashMap<>();
        for (var row : reviewRepository.findRatingStatsByCourses(courseIds)) {
            double average = row.getAverageRating() == null ? 0d : round1(row.getAverageRating());
            long count = row.getReviewCount() == null ? 0L : row.getReviewCount();
            statsByCourse.put(row.getCourseId(), new RatingStats(average, count));
        }
        return statsByCourse;
    }

    public RatingStats getInstructorRatingStats(Long instructorId) {
        return readStats(reviewRepository.findRatingStatsByInstructor(instructorId));
    }

    private RatingStats readStats(List<RatingStatsProjection> rows) {
        if (rows.isEmpty()) {
            return RatingStats.empty();
        }
        RatingStatsProjection row = rows.get(0);
        double average = row.getAverageRating() == null ? 0d : round1(row.getAverageRating());
        long count = row.getReviewCount() == null ? 0L : row.getReviewCount();
        return new RatingStats(average, count);
    }

    private double round1(double value) {
        return Math.round(value * 10d) / 10d;
    }

    private Course findPublishedCourse(String slug) {
        Course course = courseRepository.findBySlug(slug)
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khóa học"));

        if (!CourseStatus.PUBLISHED.name().equals(course.getStatus())) {
            throw new ResourceNotFoundException("Không tìm thấy khóa học");
        }
        return course;
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
