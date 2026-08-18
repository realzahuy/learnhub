package com.zh.learnhub_api.repositories.learning;

import com.zh.learnhub_api.pojo.LessonProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LessonProgressRepository extends JpaRepository<LessonProgress, Long> {

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            INSERT INTO lesson_progress (user_id, lesson_id, is_completed)
            VALUES (:userId, :lessonId, :completed)
            ON DUPLICATE KEY UPDATE is_completed = :completed
            """, nativeQuery = true)
    int upsertProgress(@Param("userId") Long userId,
                       @Param("lessonId") Long lessonId,
                       @Param("completed") boolean completed);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            INSERT INTO lesson_progress (user_id, lesson_id, is_completed, video_completed)
            VALUES (:userId, :lessonId, FALSE, TRUE)
            ON DUPLICATE KEY UPDATE video_completed = TRUE
            """, nativeQuery = true)
    int upsertVideoCompleted(@Param("userId") Long userId,
                             @Param("lessonId") Long lessonId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            INSERT INTO lesson_progress (user_id, lesson_id, is_completed, quiz_completed)
            VALUES (:userId, :lessonId, FALSE, TRUE)
            ON DUPLICATE KEY UPDATE quiz_completed = TRUE
            """, nativeQuery = true)
    int upsertQuizCompleted(@Param("userId") Long userId,
                            @Param("lessonId") Long lessonId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            UPDATE lesson_progress lp
            SET is_completed = TRUE
            WHERE lp.user_id = :userId
              AND lp.lesson_id = :lessonId
              AND (
                  lp.video_completed = TRUE
                  OR NOT EXISTS (
                      SELECT 1 FROM video v WHERE v.lesson_id = :lessonId
                  )
              )
              AND (
                  lp.quiz_completed = TRUE
                  OR NOT EXISTS (
                      SELECT 1 FROM question q WHERE q.lesson_id = :lessonId
                  )
              )
            """, nativeQuery = true)
    int markCompletedWhenRequirementsMet(@Param("userId") Long userId,
                                         @Param("lessonId") Long lessonId);

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
