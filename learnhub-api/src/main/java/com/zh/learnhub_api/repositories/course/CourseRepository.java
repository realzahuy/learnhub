package com.zh.learnhub_api.repositories.course;

import com.zh.learnhub_api.enums.CourseStatus;
import com.zh.learnhub_api.pojo.Course;
import com.zh.learnhub_api.projections.course.*;
import com.zh.learnhub_api.projections.payment.CheckoutCourseProjection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CourseRepository extends JpaRepository<Course, Long> {

    @Query("SELECT c FROM Course c LEFT JOIN FETCH c.categoryId WHERE c.id = :courseId")
    Optional<Course> findByIdWithCategory(@Param("courseId") Long courseId);

    String LIST_PROJECTION = "SELECT c.id as courseId, c.title as title, c.slug as slug, " +
           "c.shortDescription as shortDescription, " +
           "c.thumbnail as thumbnail, c.price as price, c.status as status, " +
           "c.createdAt as createdAt, c.updatedAt as updatedAt, " +
           "i.id as instructorId, i.fullName as instructorName, " +
           "cat.id as categoryId, cat.name as categoryName " +
           "FROM Course c " +
           "LEFT JOIN c.instructorId i " +
           "LEFT JOIN c.categoryId cat ";

    String DETAIL_PROJECTION = "SELECT c.id as courseId, c.title as title, c.slug as slug, " +
           "c.shortDescription as shortDescription, c.description as description, " +
           "c.thumbnail as thumbnail, c.price as price, c.status as status, " +
           "c.createdAt as createdAt, c.updatedAt as updatedAt, " +
           "i.id as instructorId, i.fullName as instructorName, " +
           "cat.id as categoryId, cat.name as categoryName " +
           "FROM Course c " +
           "LEFT JOIN c.instructorId i " +
           "LEFT JOIN c.categoryId cat ";

    String PUBLIC_DETAIL_PROJECTION = "SELECT c.id as courseId, c.title as title, c.slug as slug, " +
           "c.shortDescription as shortDescription, c.description as description, " +
           "c.thumbnail as thumbnail, c.price as price, " +
           "i.id as instructorId, i.fullName as instructorName, i.avatar as instructorAvatar, " +
           "cat.name as categoryName " +
           "FROM Course c " +
           "LEFT JOIN c.instructorId i " +
           "LEFT JOIN c.categoryId cat ";

    String RATED_LIST_PROJECTION = "SELECT c.id as courseId, c.title as title, c.slug as slug, " +
           "c.shortDescription as shortDescription, " +
           "c.thumbnail as thumbnail, c.price as price, c.status as status, " +
           "c.createdAt as createdAt, c.updatedAt as updatedAt, " +
           "i.id as instructorId, i.fullName as instructorName, " +
           "cat.id as categoryId, cat.name as categoryName, " +
           "ROUND(COALESCE(AVG(cr.rating), 0.0), 1) as averageRating, " +
           "COUNT(cr.id) as reviewCount " +
           "FROM Course c " +
           "LEFT JOIN c.instructorId i " +
           "LEFT JOIN c.categoryId cat " +
           "LEFT JOIN CourseReview cr ON cr.courseId = c ";

    @Query(value = DETAIL_PROJECTION + """
            WHERE (:instructorId IS NULL OR c.instructorId.id = :instructorId)
            AND (:status IS NULL OR c.status = :status)
            AND (:categoryName IS NULL OR cat.name = :categoryName)
            AND (:keyword IS NULL OR c.title LIKE CONCAT('%', :keyword, '%'))
            """,
           countQuery = """
            SELECT COUNT(c) FROM Course c
            LEFT JOIN c.categoryId cat
            WHERE (:instructorId IS NULL OR c.instructorId.id = :instructorId)
            AND (:status IS NULL OR c.status = :status)
            AND (:categoryName IS NULL OR cat.name = :categoryName)
            AND (:keyword IS NULL OR c.title LIKE CONCAT('%', :keyword, '%'))
            """)
    Page<CourseDetailProjection> findFilteredCourseDetails(
            @Param("instructorId") Long instructorId,
            @Param("status") CourseStatus status,
            @Param("categoryName") String categoryName,
            @Param("keyword") String keyword,
            Pageable pageable);

    @Query(value = LIST_PROJECTION + """
            WHERE c.status = com.zh.learnhub_api.enums.CourseStatus.PUBLISHED
            AND (:categoryName IS NULL OR cat.name = :categoryName)
            AND (:keyword IS NULL
                 OR c.title LIKE CONCAT('%', :keyword, '%')
                 OR c.shortDescription LIKE CONCAT('%', :keyword, '%'))
            """,
           countQuery = """
            SELECT COUNT(c) FROM Course c
            LEFT JOIN c.categoryId cat
            WHERE c.status = com.zh.learnhub_api.enums.CourseStatus.PUBLISHED
            AND (:categoryName IS NULL OR cat.name = :categoryName)
            AND (:keyword IS NULL
                 OR c.title LIKE CONCAT('%', :keyword, '%')
                 OR c.shortDescription LIKE CONCAT('%', :keyword, '%'))
            """)
    Page<CourseListProjection> findPublishedCourses(
            @Param("categoryName") String categoryName,
            @Param("keyword") String keyword,
            Pageable pageable);

    @Query(value = RATED_LIST_PROJECTION + """
            WHERE c.status = com.zh.learnhub_api.enums.CourseStatus.PUBLISHED
            AND (:categoryName IS NULL OR cat.name = :categoryName)
            AND (:keyword IS NULL
                 OR c.title LIKE CONCAT('%', :keyword, '%')
                 OR c.shortDescription LIKE CONCAT('%', :keyword, '%'))
            GROUP BY c.id, c.title, c.slug, c.shortDescription, c.thumbnail, c.price,
                     c.status, c.createdAt, c.updatedAt, i.id, i.fullName, cat.id, cat.name
            ORDER BY COALESCE(AVG(cr.rating), 0.0) DESC,
                     COUNT(cr.id) DESC, c.createdAt DESC, c.id DESC
            """,
           countQuery = """
            SELECT COUNT(c) FROM Course c
            LEFT JOIN c.categoryId cat
            WHERE c.status = com.zh.learnhub_api.enums.CourseStatus.PUBLISHED
            AND (:categoryName IS NULL OR cat.name = :categoryName)
            AND (:keyword IS NULL
                 OR c.title LIKE CONCAT('%', :keyword, '%')
                 OR c.shortDescription LIKE CONCAT('%', :keyword, '%'))
            """)
    Page<RatedCourseListProjection> findPublishedCoursesOrderByRating(
            @Param("categoryName") String categoryName,
            @Param("keyword") String keyword,
            Pageable pageable);

    @Query(PUBLIC_DETAIL_PROJECTION
         + "WHERE c.slug = :slug "
         + "AND c.status = com.zh.learnhub_api.enums.CourseStatus.PUBLISHED")
    Optional<PublicCourseDetailProjection> findPublishedBySlugForPublic(@Param("slug") String slug);

    @Query(value = """
            SELECT c.id AS courseId,
                   c.title AS title,
                   c.slug AS slug,
                   i.full_name AS instructorName,
                   EXISTS (
                       SELECT 1 FROM enrollment e
                       WHERE e.user_id = :userId AND e.course_id = c.id
                   ) AS enrolled
            FROM course c
            JOIN user i ON i.id = c.instructor_id
            WHERE c.slug = :slug
            """, nativeQuery = true)
    Optional<LearningCourseProjection> findLearningCourseBySlug(
            @Param("slug") String slug,
            @Param("userId") Long userId);

    @Query("SELECT c.id FROM Course c WHERE c.slug = :slug "
         + "AND c.status = com.zh.learnhub_api.enums.CourseStatus.PUBLISHED")
    Optional<Long> findPublishedIdBySlug(@Param("slug") String slug);

    @Query("""
            SELECT c.id AS courseId, c.price AS price
            FROM Course c
            WHERE c.id IN :courseIds
            AND NOT EXISTS (
                SELECT e.id
                FROM Enrollment e
                WHERE e.userId.id = :userId
                AND e.courseId.id = c.id
            )
            """)
    List<CheckoutCourseProjection> findCheckoutCourses(@Param("courseIds") List<Long> courseIds, @Param("userId") Long userId);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long courseId);

    long countByCategoryId_Id(Short categoryId);

    @Query(value = LIST_PROJECTION
                 + "WHERE c.instructorId.id = :instructorId "
                 + "AND c.status = com.zh.learnhub_api.enums.CourseStatus.PUBLISHED "
                 + "ORDER BY c.createdAt DESC",
           countQuery = "SELECT COUNT(c) FROM Course c "
                 + "WHERE c.instructorId.id = :instructorId "
                 + "AND c.status = com.zh.learnhub_api.enums.CourseStatus.PUBLISHED")
    Page<CourseListProjection> findPublishedCoursesByInstructor(
            @Param("instructorId") Long instructorId,
            Pageable pageable);

    long countByInstructorId_IdAndStatus(Long instructorId, CourseStatus status);

    @Query("SELECT c.slug FROM Course c "
         + "WHERE c.instructorId.id = :instructorId "
         + "AND c.status = com.zh.learnhub_api.enums.CourseStatus.PUBLISHED")
    List<String> findPublishedSlugsByInstructorId(@Param("instructorId") Long instructorId);

    @Query("SELECT c.id FROM Course c "
         + "WHERE c.status = com.zh.learnhub_api.enums.CourseStatus.PUBLISHED ORDER BY c.id")
    List<Long> findPublishedCourseIds();

    @Query(DETAIL_PROJECTION +
           "WHERE c.id = :courseId AND c.instructorId.id = :instructorId")
    Optional<CourseDetailProjection> findInstructorCourseDetail(@Param("courseId") Long courseId,
                                                                 @Param("instructorId") Long instructorId);

    @Modifying
    @Query("UPDATE Course c SET c.status = :newStatus WHERE c.id = :courseId AND c.status = :currentStatus")
    int updateStatus(@Param("courseId") Long courseId,
                     @Param("currentStatus") CourseStatus currentStatus,
                     @Param("newStatus") CourseStatus newStatus);

    @Query("SELECT c.instructorId.id FROM Course c WHERE c.id = :courseId")
    Optional<Long> findInstructorIdByCourseId(@Param("courseId") Long courseId);

    @Query("SELECT c.instructorId.id AS instructorId, c.status AS status, "
         + "COUNT(c) AS courseCount FROM Course c "
         + "WHERE c.instructorId.id IN :instructorIds "
         + "GROUP BY c.instructorId.id, c.status")
    List<InstructorCourseStatusCountProjection> countCoursesByInstructorGroupedByStatus(
            @Param("instructorIds") List<Long> instructorIds);

    @Query("SELECT c.status AS status, COUNT(c) AS courseCount FROM Course c "
         + "WHERE c.instructorId.id = :instructorId "
         + "GROUP BY c.status")
    List<CourseStatusCountProjection> countCoursesByStatusForInstructor(@Param("instructorId") Long instructorId);

    @Query("SELECT c.status AS status, COUNT(c) AS courseCount FROM Course c GROUP BY c.status")
    List<CourseStatusCountProjection> countCoursesByStatus();

    interface CourseStatusCountProjection {
        CourseStatus getStatus();
        Long getCourseCount();
    }

    interface InstructorCourseStatusCountProjection extends CourseStatusCountProjection {
        Long getInstructorId();
    }
}
