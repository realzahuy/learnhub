package com.zh.learnhub_api.repositories.course;

import com.zh.learnhub_api.pojo.Course;
import com.zh.learnhub_api.projections.course.CourseDetailProjection;
import com.zh.learnhub_api.projections.course.CourseEditAccessProjection;
import com.zh.learnhub_api.projections.course.CourseListProjection;
import com.zh.learnhub_api.projections.course.CourseStatusCountProjection;
import com.zh.learnhub_api.projections.course.InstructorCourseStatusCountProjection;
import com.zh.learnhub_api.projections.course.PublicCourseDetailProjection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CourseRepository extends JpaRepository<Course, Long>, CourseSearchRepository {

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

    @Query(PUBLIC_DETAIL_PROJECTION +
           "WHERE c.slug = :slug AND c.status = 'PUBLISHED'")
    Optional<PublicCourseDetailProjection> findPublishedBySlugForPublic(@Param("slug") String slug);

    Optional<Course> findBySlug(String slug);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long courseId);

    long countByCategoryId_Id(Short categoryId);

    @Query(value = LIST_PROJECTION
                 + "WHERE c.instructorId.id = :instructorId AND c.status = 'PUBLISHED' "
                 + "ORDER BY c.createdAt DESC",
           countQuery = "SELECT COUNT(c) FROM Course c "
                 + "WHERE c.instructorId.id = :instructorId AND c.status = 'PUBLISHED'")
    Page<CourseListProjection> findPublishedCoursesByInstructor(
            @Param("instructorId") Long instructorId,
            Pageable pageable);

    long countByInstructorId_IdAndStatus(Long instructorId, String status);

    @Query(LIST_PROJECTION +
           "WHERE c.status = 'PUBLISHED' AND c.id IN :courseIds")
    List<CourseListProjection> findPublishedRecommendationCoursesByIds(
            @Param("courseIds") List<Long> courseIds);

    @Query("SELECT c.id FROM Course c WHERE c.status = 'PUBLISHED' ORDER BY c.id")
    List<Long> findPublishedCourseIds();

    @Query(DETAIL_PROJECTION +
           "WHERE c.id = :courseId AND c.instructorId.id = :instructorId")
    Optional<CourseDetailProjection> findInstructorCourseDetail(@Param("courseId") Long courseId,
                                                                 @Param("instructorId") Long instructorId);

    @Modifying
    @Query("UPDATE Course c SET c.status = :newStatus WHERE c.id = :courseId AND c.status = :currentStatus")
    int updateStatus(@Param("courseId") Long courseId,
                     @Param("currentStatus") String currentStatus,
                     @Param("newStatus") String newStatus);

    @Query("SELECT c.instructorId.id FROM Course c WHERE c.id = :courseId")
    Optional<Long> findInstructorIdByCourseId(@Param("courseId") Long courseId);

    @Query("SELECT c.instructorId.id AS instructorId, c.status AS status "
         + "FROM Course c WHERE c.id = :courseId")
    Optional<CourseEditAccessProjection> findEditAccessByCourseId(
            @Param("courseId") Long courseId);

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
}
