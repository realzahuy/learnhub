package com.zh.learnhub_api.services.instructor;

import com.zh.learnhub_api.dtos.instructor.InstructorCourseContentDTO;
import com.zh.learnhub_api.dtos.instructor.InstructorCourseContentDTO.InstructorLessonContentDTO;
import com.zh.learnhub_api.dtos.media.VideoResponseDTO;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.mappers.QuestionMapper;
import com.zh.learnhub_api.pojo.Course;
import com.zh.learnhub_api.pojo.Lesson;
import com.zh.learnhub_api.pojo.Question;
import com.zh.learnhub_api.pojo.Video;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import com.zh.learnhub_api.repositories.course.LessonRepository;
import com.zh.learnhub_api.repositories.course.QuestionRepository;
import com.zh.learnhub_api.repositories.media.VideoRepository;
import com.zh.learnhub_api.services.course.CourseEditPolicy;
import com.zh.learnhub_api.services.media.VideoPlaybackUrls;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InstructorCourseContentService {

    private final CourseRepository courseRepository;
    private final LessonRepository lessonRepository;
    private final VideoRepository videoRepository;
    private final QuestionRepository questionRepository;
    private final CourseEditPolicy courseEditPolicy;
    private final QuestionMapper questionMapper;

    public InstructorCourseContentDTO getCourseContent(Long courseId, Long instructorId) {
        Course course = courseRepository
                .findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khóa học"));
        courseEditPolicy.requireOwner(course, instructorId);

        List<Lesson> lessons = lessonRepository.findByCourseId_IdOrderByPositionAsc(courseId);

        Map<Long, List<Video>> videosByLesson = videoRepository.findInstructorByCourseId(courseId).stream()
                .collect(Collectors.groupingBy(video -> video.getLesson().getId()));

        Map<Long, List<Question>> questionsByLesson = questionRepository.findByCourseIdWithAnswers(courseId).stream()
                .collect(
                        Collectors.groupingBy(question -> question.getLessonId().getId()));

        List<InstructorLessonContentDTO> lessonDTOs = lessons.stream()
                .map(lesson -> new InstructorLessonContentDTO(
                        lesson.getId(),
                        lesson.getTitle(),
                        lesson.getPosition(),
                        lesson.isPreview(),
                        courseId,
                        videosByLesson.getOrDefault(lesson.getId(), List.of()).stream()
                                .map(this::toVideoDTO)
                                .toList(),
                        questionsByLesson.getOrDefault(lesson.getId(), List.of()).stream()
                                .sorted(Comparator.comparing(
                                                Question::getPosition, Comparator.nullsLast(Comparator.naturalOrder()))
                                        .thenComparing(Question::getId))
                                .map(question -> questionMapper.toDTO(question, question.getAnswerSet()))
                                .toList()))
                .toList();

        return new InstructorCourseContentDTO(courseId, course.getTitle(), lessonDTOs);
    }

    private VideoResponseDTO toVideoDTO(Video video) {
        return VideoResponseDTO.builder()
                .id(video.getId())
                .title(video.getTitle())
                .status(video.getStatus())
                .position(video.getPosition())
                .durationSeconds(video.getDurationSeconds())
                .playbackUrl(VideoPlaybackUrls.instructor(video))
                .build();
    }
}
