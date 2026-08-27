package com.zh.learnhub_api.repositories.course;

import com.zh.learnhub_api.pojo.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface QuestionRepository extends JpaRepository<Question, Long> {

    @Query("SELECT q FROM Question q "
         + "JOIN FETCH q.lessonId l "
         + "JOIN FETCH l.courseId "
         + "WHERE q.id = :questionId")
    Optional<Question> findByIdWithLessonAndCourse(@Param("questionId") Long questionId);

    @Query("SELECT COALESCE(MAX(q.position), 0) FROM Question q WHERE q.lessonId.id = :lessonId")
    int findMaxPositionByLessonId(@Param("lessonId") Long lessonId);

    @Query("SELECT q.lessonId.id AS lessonId, COUNT(q) AS questionCount FROM Question q "
            + "WHERE q.lessonId.courseId.id = :courseId GROUP BY q.lessonId.id")
    List<LessonQuestionCountProjection> countByCourseGroupedByLesson(@Param("courseId") Long courseId);

    @Query("SELECT DISTINCT q FROM Question q " + "LEFT JOIN FETCH q.answerSet " + "WHERE q.lessonId.id = :lessonId")
    List<Question> findByLessonIdWithAnswers(@Param("lessonId") Long lessonId);

    @Query("SELECT DISTINCT q FROM Question q "
            + "LEFT JOIN FETCH q.answerSet "
            + "WHERE q.lessonId.courseId.id = :courseId")
    List<Question> findByCourseIdWithAnswers(@Param("courseId") Long courseId);

    interface LessonQuestionCountProjection {
        Long getLessonId();

        Long getQuestionCount();
    }
}
