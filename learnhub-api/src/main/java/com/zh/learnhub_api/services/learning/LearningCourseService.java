package com.zh.learnhub_api.services.learning;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.dtos.learning.LearnCourseDTO;
import com.zh.learnhub_api.dtos.learning.LearnCourseDTO.LearnLessonDTO;
import com.zh.learnhub_api.dtos.course.CourseListItemDTO;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.Lesson;
import com.zh.learnhub_api.pojo.LessonProgress;
import com.zh.learnhub_api.pojo.Video;
import com.zh.learnhub_api.projections.course.LearningCourseProjection;
import com.zh.learnhub_api.projections.course.RecommendationCourseProjection;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import com.zh.learnhub_api.repositories.learning.EnrollmentRepository;
import com.zh.learnhub_api.repositories.learning.LessonProgressRepository;
import com.zh.learnhub_api.repositories.course.LessonRepository;
import com.zh.learnhub_api.repositories.course.QuestionRepository;
import com.zh.learnhub_api.repositories.learning.QuizAttemptRepository;
import com.zh.learnhub_api.repositories.media.VideoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LearningCourseService {

    private final CourseRepository courseRepository;
    private final LessonRepository lessonRepository;
    private final VideoRepository videoRepository;
    private final QuestionRepository questionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final VideoPlaybackService videoPlaybackService;
    private final LessonProgressService lessonProgressService;
    private final LearningRecommendationService recommendationService;
    private final AppProperties.Quiz quizProperties;

    public LearnCourseDTO getCourseForLearningBySlug(String slug, Long userId) {
        LearningCourseProjection course = courseRepository.findLearningCourseBySlug(slug, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khóa học"));
        return getCourseForLearning(course, userId);
    }

    private LearnCourseDTO getCourseForLearning(LearningCourseProjection course, Long userId) {
        Long courseId = course.getCourseId();
        lessonProgressService.requireEnrollment(course.getEnrolled());

        List<Lesson> lessons = lessonRepository.findByCourseId_IdOrderByPositionAsc(courseId);
        Map<Long, List<Video>> videosByLesson = videoRepository.findPublicByCourseId(courseId)
                .stream()
                .collect(Collectors.groupingBy(video -> video.getLesson().getId()));
        Map<Long, Integer> questionCounts = questionRepository
                .countByCourseGroupedByLesson(courseId).stream()
                .collect(Collectors.toMap(
                        row -> row.getLessonId(),
                        row -> row.getQuestionCount().intValue()));
        Map<Long, Integer> bestQuizScores = quizAttemptRepository
                .findBestScoresByCourse(userId, courseId).stream()
                .collect(Collectors.toMap(
                        row -> row.getLessonId(),
                        row -> row.getBestScore()));
        Map<Long, LessonProgress> progressByLesson = lessonProgressRepository
                .findByUserAndCourse(userId, courseId).stream()
                .collect(Collectors.toMap(
                        progress -> progress.getLessonId().getId(),
                        progress -> progress));
        Set<Long> completedLessonIds = progressByLesson.values().stream()
                .filter(LessonProgress::isCompleted)
                .map(progress -> progress.getLessonId().getId())
                .collect(Collectors.toSet());

        List<LearnLessonDTO> lessonDTOs = lessons.stream()
                .map(lesson -> {
                    LessonProgress progress = progressByLesson.get(lesson.getId());
                    return new LearnLessonDTO(
                            lesson.getId(),
                            lesson.getTitle(),
                            lesson.getPosition(),
                            lesson.isPreview(),
                            progress != null && progress.isCompleted(),
                            progress != null && progress.isVideoCompleted(),
                            progress != null && progress.isQuizCompleted(),
                            videosByLesson.getOrDefault(lesson.getId(), List.of()).stream()
                                    .map(videoPlaybackService::toPlayableVideo)
                                    .collect(Collectors.toList()),
                            questionCounts.getOrDefault(lesson.getId(), 0),
                            bestQuizScores.get(lesson.getId()));
                })
                .collect(Collectors.toList());

        return new LearnCourseDTO(
                courseId,
                course.getTitle(),
                course.getSlug(),
                course.getInstructorName(),
                lessonDTOs,
                completedLessonIds.size(),
                lessons.size(),
                quizProperties.passPercent());
    }

    public List<CourseListItemDTO> getRecommendations(Long courseId, Long userId) {
        RecommendationCourseProjection course = courseRepository
                .findRecommendationSource(courseId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khóa học"));
        lessonProgressService.requireEnrollment(course.getEnrolled());

        Set<Long> enrolledCourseIds = enrollmentRepository.findCourseIdsByUserId(userId);
        return recommendationService.getRecommendations(course, enrolledCourseIds);
    }
}
