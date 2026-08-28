package com.zh.learnhub_api.services.course;

import com.zh.learnhub_api.dtos.common.PositionReorderRequestDTO;
import com.zh.learnhub_api.dtos.course.LessonRequestDTO;
import com.zh.learnhub_api.dtos.course.LessonResponseDTO;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.Course;
import com.zh.learnhub_api.pojo.Lesson;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import com.zh.learnhub_api.repositories.course.LessonRepository;
import com.zh.learnhub_api.services.media.MediaCleanupService;
import com.zh.learnhub_api.utils.PositionReorderer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LessonService {

    private final LessonRepository lessonRepository;
    private final CourseRepository courseRepository;
    private final MediaCleanupService mediaCleanupService;
    private final CourseEditPolicy courseEditPolicy;
    private final PositionReorderer positionReorderer;

    @Transactional
    public List<LessonResponseDTO> createLessons(Long courseId, List<LessonRequestDTO> requests, Long instructorId) {
        Course course = courseRepository
                .findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khóa học"));

        courseEditPolicy.requireOwnerAndEditable(course, instructorId);

        int maxPosition = lessonRepository.findMaxPositionByCourseId(courseId);
        int currentPosition = maxPosition;

        List<Lesson> lessons = new java.util.ArrayList<>();
        for (LessonRequestDTO request : requests) {

            int position = request.getPosition() != null ? request.getPosition() : ++currentPosition;

            Lesson lesson = new Lesson();
            lesson.setTitle(request.getTitle());
            lesson.setPosition(position);
            lesson.setPreview(request.getIsPreview() != null ? request.getIsPreview() : false);
            lesson.setCourseId(course);

            lessons.add(lesson);
        }

        List<Lesson> savedLessons = lessonRepository.saveAll(lessons);

        return savedLessons.stream().map(this::mapToDTO).toList();
    }

    @Transactional
    public LessonResponseDTO updateLesson(Long courseId, Long lessonId, LessonRequestDTO request, Long instructorId) {

        Course course = courseRepository
                .findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khóa học"));

        courseEditPolicy.requireOwnerAndEditable(course, instructorId);

        Lesson lesson = lessonRepository
                .findByIdAndCourseId_Id(lessonId, courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài giảng"));

        lesson.setTitle(request.getTitle());
        lesson.setPreview(request.getIsPreview() != null ? request.getIsPreview() : false);

        if (request.getPosition() != null) {
            lesson.setPosition(request.getPosition());
        }

        return mapToDTO(lesson);
    }

    @Transactional
    public List<LessonResponseDTO> reorderLessons(
            Long courseId, List<PositionReorderRequestDTO> requests, Long instructorId) {
        Course course = courseRepository
                .findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khóa học"));

        courseEditPolicy.requireOwnerAndEditable(course, instructorId);

        long distinctPositions = requests.stream()
                .map(PositionReorderRequestDTO::getPosition)
                .distinct()
                .count();
        if (distinctPositions != requests.size()) {
            throw new IllegalArgumentException("Các bài giảng không được trùng vị trí");
        }

        List<Lesson> lessons = lessonRepository.findByCourseId_IdOrderByPositionAsc(courseId);
        Map<Long, Lesson> byId = lessons.stream().collect(Collectors.toMap(Lesson::getId, l -> l));

        if (requests.size() != lessons.size()) {
            throw new IllegalArgumentException("Phải gửi đủ bài giảng");
        }
        for (PositionReorderRequestDTO request : requests) {
            if (!byId.containsKey(request.getId())) {
                throw new ResourceNotFoundException("Không tìm thấy bài giảng trong khóa học");
            }
        }

        List<Lesson> saved = positionReorderer.reorder(
                lessons,
                Lesson::getPosition,
                Lesson::setPosition,
                lessonRepository::saveAllAndFlush,
                () -> requests.forEach(request -> byId.get(request.getId()).setPosition(request.getPosition())));

        return saved.stream()
                .sorted(java.util.Comparator.comparingInt(Lesson::getPosition))
                .map(this::mapToDTO)
                .toList();
    }

    @Transactional
    public void deleteLesson(Long courseId, Long lessonId, Long instructorId) {

        Course course = courseRepository
                .findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khóa học"));

        courseEditPolicy.requireOwnerAndEditable(course, instructorId);

        Lesson lesson = lessonRepository
                .findByIdAndCourseId_Id(lessonId, courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài giảng"));

        mediaCleanupService.scheduleLessonCleanup(courseId, lessonId);

        lessonRepository.delete(lesson);
    }

    private LessonResponseDTO mapToDTO(Lesson lesson) {
        return new LessonResponseDTO(
                lesson.getId(),
                lesson.getTitle(),
                lesson.getPosition(),
                lesson.isPreview(),
                lesson.getCourseId().getId());
    }
}
