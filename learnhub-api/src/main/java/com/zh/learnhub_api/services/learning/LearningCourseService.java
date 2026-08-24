package com.zh.learnhub_api.services.learning;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.dtos.learning.LearnCourseDTO;
import com.zh.learnhub_api.dtos.learning.LearnCourseDTO.LearnLessonDTO;
import com.zh.learnhub_api.dtos.course.RecommendationCardDTO;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.Lesson;
import com.zh.learnhub_api.pojo.Video;
import com.zh.learnhub_api.projections.course.LearningCourseProjection;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import com.zh.learnhub_api.repositories.learning.EnrollmentRepository;
import com.zh.learnhub_api.repositories.course.LessonRepository;
import com.zh.learnhub_api.repositories.course.QuestionRepository;
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
    private final VideoPlaybackService videoPlaybackService;
    private final LearningAccessService learningAccessService;
    private final LearningRecommendationService recommendationService;
    private final AppProperties.Quiz quizProperties;

    public LearnCourseDTO getCourseForLearningBySlug(String slug, Long userId) {
        LearningCourseProjection course = courseRepository.findLearningCourseBySlug(slug, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khóa học"));
        return getCourseForLearning(course);
    }

    private LearnCourseDTO getCourseForLearning(LearningCourseProjection course) {
        Long courseId = course.getCourseId();
        learningAccessService.requireEnrollment(course.getEnrolled());

        List<Lesson> lessons = lessonRepository.findByCourseId_IdOrderByPositionAsc(courseId);
        Map<Long, List<Video>> videosByLesson = videoRepository.findPublicByCourseId(courseId)
                .stream()
                .collect(Collectors.groupingBy(video -> video.getLesson().getId()));
        Map<Long, Integer> questionCounts = questionRepository
                .countByCourseGroupedByLesson(courseId).stream()
                .collect(Collectors.toMap(
                        row -> row.getLessonId(),
                        row -> row.getQuestionCount().intValue()));
        List<LearnLessonDTO> lessonDTOs = lessons.stream()
                .map(lesson -> new LearnLessonDTO(
                            lesson.getId(),
                            lesson.getTitle(),
                            lesson.getPosition(),
                            lesson.isPreview(),
                            videosByLesson.getOrDefault(lesson.getId(), List.of()).stream()
                                    .map(videoPlaybackService::toPlayableVideo)
                                    .collect(Collectors.toList()),
                            questionCounts.getOrDefault(lesson.getId(), 0)))
                .collect(Collectors.toList());

        return new LearnCourseDTO(
                courseId,
                course.getTitle(),
                course.getSlug(),
                course.getInstructorName(),
                lessonDTOs,
                lessons.size(),
                quizProperties.passPercent());
    }

    public List<RecommendationCardDTO> getRecommendations(Long courseId, Long userId) {
        Set<Long> enrolledCourseIds = enrollmentRepository.findCourseIdsByUserId(userId);
        learningAccessService.requireEnrollment(enrolledCourseIds.contains(courseId));
        return recommendationService.getRecommendations(courseId, enrolledCourseIds);
    }
}
