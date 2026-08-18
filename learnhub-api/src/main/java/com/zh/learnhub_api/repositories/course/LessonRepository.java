package com.zh.learnhub_api.repositories.course;

import com.zh.learnhub_api.pojo.Lesson;
import com.zh.learnhub_api.projections.learning.CourseLessonCountProjection;
import com.zh.learnhub_api.projections.learning.LessonAccessProjection;
import com.zh.learnhub_api.projections.learning.QuizOpenProjection;
import com.zh.learnhub_api.projections.learning.QuizSubmitAccessProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LessonRepository extends JpaRepository<Lesson, Long> {

    List<Lesson> findByCourseId_IdOrderByPositionAsc(Long courseId);

    Optional<Lesson> findByIdAndCourseId_Id(Long id, Long courseId);

    @Query(value = """
            SELECT l.id AS lessonId,
                   l.title AS lessonTitle,
                   l.course_id AS courseId,
                   EXISTS (
                       SELECT 1 FROM enrollment e
                       WHERE e.user_id = :userId AND e.course_id = l.course_id
                   ) AS enrolled
            FROM lesson l
            WHERE l.id = :lessonId
            """, nativeQuery = true)
    Optional<LessonAccessProjection> findLearningAccess(
            @Param("lessonId") Long lessonId,
            @Param("userId") Long userId);

    @Query(value = """
            SELECT l.id AS lessonId,
                   l.title AS lessonTitle,
                   l.course_id AS courseId,
                   EXISTS (
                       SELECT 1 FROM enrollment e
                       WHERE e.user_id = :userId AND e.course_id = l.course_id
                   ) AS enrolled,
                   stats.best_score AS bestScore,
                   COALESCE(stats.attempt_count, 0) AS attemptCount,
                   latest.id AS attemptId,
                   latest.correct_count AS correctCount,
                   latest.total_questions AS totalQuestions,
                   latest.score_percent AS scorePercent,
                   latest.passed AS passed,
                   latest.answer_snapshot AS answerSnapshot
            FROM lesson l
            LEFT JOIN (
                SELECT lesson_id,
                       MAX(score_percent) AS best_score,
                       COUNT(*) AS attempt_count
                FROM quiz_attempt
                WHERE user_id = :userId AND lesson_id = :lessonId
                GROUP BY lesson_id
            ) stats ON stats.lesson_id = l.id
            LEFT JOIN quiz_attempt latest ON latest.id = (
                SELECT qa.id
                FROM quiz_attempt qa
                WHERE qa.user_id = :userId AND qa.lesson_id = :lessonId
                ORDER BY qa.submitted_at DESC, qa.id DESC
                LIMIT 1
            )
            WHERE l.id = :lessonId
            """, nativeQuery = true)
    Optional<QuizOpenProjection> findQuizOpen(
            @Param("lessonId") Long lessonId,
            @Param("userId") Long userId);

    @Query(value = """
            SELECT l.id AS lessonId,
                   l.title AS lessonTitle,
                   l.course_id AS courseId,
                   EXISTS (
                       SELECT 1 FROM enrollment e
                       WHERE e.user_id = :userId AND e.course_id = l.course_id
                   ) AS enrolled,
                   (
                       SELECT MAX(qa.score_percent)
                       FROM quiz_attempt qa
                       WHERE qa.user_id = :userId AND qa.lesson_id = l.id
                   ) AS bestScore
            FROM lesson l
            WHERE l.id = :lessonId
            """, nativeQuery = true)
    Optional<QuizSubmitAccessProjection> findQuizSubmitAccess(
            @Param("lessonId") Long lessonId,
            @Param("userId") Long userId);

    @Query("SELECT l.courseId.id AS courseId, COUNT(l) AS lessonCount FROM Lesson l "
         + "WHERE l.courseId.id IN :courseIds GROUP BY l.courseId.id")
    List<CourseLessonCountProjection> countGroupedByCourseIds(@Param("courseIds") List<Long> courseIds);

    @Query("SELECT COALESCE(MAX(l.position), 0) FROM Lesson l WHERE l.courseId.id = :courseId")
    int findMaxPositionByCourseId(@Param("courseId") Long courseId);
}
