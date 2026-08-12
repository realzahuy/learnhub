package com.zh.learnhub_api.repositories.course;

import com.zh.learnhub_api.pojo.Lesson;
import com.zh.learnhub_api.projections.learning.CourseLessonCountProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LessonRepository extends JpaRepository<Lesson, Long> {

    List<Lesson> findByCourseId_IdOrderByPositionAsc(Long courseId);

    Optional<Lesson> findByIdAndCourseId_Id(Long id, Long courseId);

    @Query("SELECT l.courseId.id AS courseId, COUNT(l) AS lessonCount FROM Lesson l "
         + "WHERE l.courseId.id IN :courseIds GROUP BY l.courseId.id")
    List<CourseLessonCountProjection> countGroupedByCourseIds(@Param("courseIds") List<Long> courseIds);

    @Query("SELECT COALESCE(MAX(l.position), 0) FROM Lesson l WHERE l.courseId.id = :courseId")
    int findMaxPositionByCourseId(@Param("courseId") Long courseId);
}
