package com.zh.learnhub_api.repositories.learning;

import com.zh.learnhub_api.pojo.LessonProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LessonProgressRepository extends JpaRepository<LessonProgress, Long> {

    Optional<LessonProgress> findByUserId_IdAndLessonId_Id(Long userId, Long lessonId);

    @Query("SELECT p FROM LessonProgress p "
         + "WHERE p.userId.id = :userId AND p.lessonId.courseId.id = :courseId")
    List<LessonProgress> findByUserAndCourse(@Param("userId") Long userId,
                                             @Param("courseId") Long courseId);

    @Query("SELECT p FROM LessonProgress p JOIN FETCH p.lessonId l "
         + "WHERE p.userId.id = :userId AND l.courseId.id IN :courseIds")
    List<LessonProgress> findByUserAndCourseIds(@Param("userId") Long userId,
                                                @Param("courseIds") List<Long> courseIds);
}
