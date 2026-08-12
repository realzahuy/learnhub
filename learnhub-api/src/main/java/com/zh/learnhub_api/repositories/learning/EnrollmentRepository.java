package com.zh.learnhub_api.repositories.learning;

import com.zh.learnhub_api.pojo.Enrollment;
import com.zh.learnhub_api.pojo.User;
import com.zh.learnhub_api.projections.admin.InstructorStudentCountProjection;
import com.zh.learnhub_api.projections.learning.EnrollmentListProjection;
import com.zh.learnhub_api.projections.stats.TimeBucketCountProjection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {

    boolean existsByUserId_IdAndCourseId_Id(Long userId, Long courseId);

    @Query("SELECT e.courseId.id FROM Enrollment e "
         + "WHERE e.userId = :user AND e.courseId.id IN :courseIds")
    Set<Long> findCourseIdsByUserAndCourseIds(@Param("user") User user,
                                              @Param("courseIds") List<Long> courseIds);

    @Query("SELECT e.courseId.id FROM Enrollment e WHERE e.userId.id = :userId")
    Set<Long> findCourseIdsByUserId(@Param("userId") Long userId);

    @Query("SELECT e.courseId.id FROM Enrollment e WHERE e.userId.username = :username")
    Set<Long> findCourseIdsByUsername(@Param("username") String username);

    @Query(value = "SELECT e.id AS enrollmentId, c.id AS courseId, "
                 + "c.title AS courseTitle, c.slug AS courseSlug, "
                 + "c.thumbnail AS courseThumbnail, i.fullName AS instructorName, "
                 + "e.enrolledAt AS enrolledAt FROM Enrollment e "
                 + "JOIN e.courseId c JOIN c.instructorId i "
                 + "WHERE e.userId.id = :userId",
           countQuery = "SELECT COUNT(e) FROM Enrollment e WHERE e.userId.id = :userId")
    Page<EnrollmentListProjection> findListByUserId(
            @Param("userId") Long userId,
            Pageable pageable);

    @Query("SELECT c.instructorId.id AS instructorId, "
         + "COUNT(DISTINCT e.userId.id) AS studentCount FROM Enrollment e "
         + "JOIN e.courseId c "
         + "WHERE c.instructorId.id IN :instructorIds "
         + "GROUP BY c.instructorId.id")
    List<InstructorStudentCountProjection> countDistinctStudentsByInstructor(
            @Param("instructorIds") List<Long> instructorIds);

    @Query("SELECT COUNT(DISTINCT e.userId.id) FROM Enrollment e "
         + "WHERE e.courseId.instructorId.id = :instructorId")
    long countDistinctStudents(@Param("instructorId") Long instructorId);

    @Query("SELECT COUNT(e) FROM Enrollment e "
         + "WHERE e.courseId.instructorId.id = :instructorId "
         + "AND e.enrolledAt >= :from AND e.enrolledAt < :to")
    long countEnrollmentsBetween(@Param("instructorId") Long instructorId,
                                 @Param("from") LocalDateTime from,
                                 @Param("to") LocalDateTime to);

    @Query(value = "SELECT CASE "
                 + "WHEN :groupBy = 'quarter' THEN CONCAT(YEAR(e.enrolled_at), '-Q', QUARTER(e.enrolled_at)) "
                 + "WHEN :groupBy = 'month' THEN DATE_FORMAT(e.enrolled_at, '%Y-%m') "
                 + "ELSE DATE_FORMAT(e.enrolled_at, '%Y-%m-%d') END AS bucket, COUNT(*) AS total "
                 + "FROM enrollment e JOIN course c ON c.id = e.course_id "
                 + "WHERE c.instructor_id = :instructorId "
                 + "AND e.enrolled_at >= :from AND e.enrolled_at < :to "
                 + "GROUP BY bucket ORDER BY bucket",
           nativeQuery = true)
    List<TimeBucketCountProjection> countEnrollmentsByBucket(@Param("instructorId") Long instructorId,
                                                             @Param("from") LocalDateTime from,
                                                             @Param("to") LocalDateTime to,
                                                             @Param("groupBy") String groupBy);

    @Query(value = "SELECT CASE "
                 + "WHEN :groupBy = 'quarter' THEN CONCAT(YEAR(f.first_at), '-Q', QUARTER(f.first_at)) "
                 + "WHEN :groupBy = 'month' THEN DATE_FORMAT(f.first_at, '%Y-%m') "
                 + "ELSE DATE_FORMAT(f.first_at, '%Y-%m-%d') END AS bucket, COUNT(*) AS total "
                 + "FROM (SELECT e.user_id, MIN(e.enrolled_at) AS first_at "
                 + "      FROM enrollment e JOIN course c ON c.id = e.course_id "
                 + "      WHERE c.instructor_id = :instructorId "
                 + "      GROUP BY e.user_id) f "
                 + "WHERE f.first_at >= :from AND f.first_at < :to "
                 + "GROUP BY bucket ORDER BY bucket",
           nativeQuery = true)
    List<TimeBucketCountProjection> countNewStudentsByBucket(@Param("instructorId") Long instructorId,
                                                             @Param("from") LocalDateTime from,
                                                             @Param("to") LocalDateTime to,
                                                             @Param("groupBy") String groupBy);

    @Query("SELECT COUNT(DISTINCT e.userId.id) FROM Enrollment e")
    long countDistinctStudentsAllInstructors();
}
