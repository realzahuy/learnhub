package com.zh.learnhub_api.repositories.learning;

import com.zh.learnhub_api.pojo.QuizAttempt;
import com.zh.learnhub_api.projections.learning.LessonBestScoreProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, Long> {

    @Query("SELECT MAX(a.scorePercent) FROM QuizAttempt a "
         + "WHERE a.userId.id = :userId AND a.lessonId.id = :lessonId")
    Integer findBestScore(@Param("userId") Long userId, @Param("lessonId") Long lessonId);

    long countByUserId_IdAndLessonId_Id(Long userId, Long lessonId);

    Optional<QuizAttempt> findTopByUserId_IdAndLessonId_IdOrderBySubmittedAtDescIdDesc(
            Long userId, Long lessonId);

    @Query("SELECT a.lessonId.id AS lessonId, MAX(a.scorePercent) AS bestScore FROM QuizAttempt a "
         + "WHERE a.userId.id = :userId AND a.lessonId.courseId.id = :courseId "
         + "GROUP BY a.lessonId.id")
    List<LessonBestScoreProjection> findBestScoresByCourse(@Param("userId") Long userId,
                                                           @Param("courseId") Long courseId);
}
