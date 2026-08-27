package com.zh.learnhub_api.repositories.learning;

import com.zh.learnhub_api.pojo.CourseReview;
import com.zh.learnhub_api.projections.review.RatingStatsProjection;
import com.zh.learnhub_api.projections.review.ReviewListProjection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CourseReviewRepository extends JpaRepository<CourseReview, Long> {

    Optional<CourseReview> findByUserId_IdAndCourseId_Id(Long userId, Long courseId);

    @Query(
            value = "SELECT r.id AS id, r.rating AS rating, r.comment AS comment, "
                    + "u.id AS userId, u.fullName AS userFullName, u.avatar AS userAvatar, "
                    + "r.createdAt AS createdAt, r.updatedAt AS updatedAt "
                    + "FROM CourseReview r JOIN r.userId u "
                    + "WHERE r.courseId.id = :courseId "
                    + "ORDER BY r.createdAt DESC, r.id DESC",
            countQuery = "SELECT COUNT(r) FROM CourseReview r WHERE r.courseId.id = :courseId")
    Page<ReviewListProjection> findListByCourse(@Param("courseId") Long courseId, Pageable pageable);

    @Query("SELECT r.rating AS rating, COUNT(r) AS reviewCount FROM CourseReview r "
            + "WHERE r.courseId.id = :courseId "
            + "GROUP BY r.rating")
    List<RatingDistributionProjection> countByRatingForCourse(@Param("courseId") Long courseId);

    @Query("SELECT AVG(r.rating) AS averageRating, COUNT(r) AS reviewCount FROM CourseReview r "
            + "WHERE r.courseId.instructorId.id = :instructorId "
            + "AND r.courseId.status = com.zh.learnhub_api.enums.CourseStatus.PUBLISHED")
    List<RatingStatsProjection> findRatingStatsByInstructor(@Param("instructorId") Long instructorId);

    @Query("SELECT r.courseId.id AS courseId, AVG(r.rating) AS averageRating, "
            + "COUNT(r) AS reviewCount FROM CourseReview r "
            + "WHERE r.courseId.id IN :courseIds "
            + "GROUP BY r.courseId.id")
    List<CourseRatingStatsProjection> findRatingStatsByCourses(@Param("courseIds") List<Long> courseIds);

    interface RatingDistributionProjection {
        Integer getRating();

        Long getReviewCount();
    }

    interface CourseRatingStatsProjection extends RatingStatsProjection {
        Long getCourseId();
    }
}
