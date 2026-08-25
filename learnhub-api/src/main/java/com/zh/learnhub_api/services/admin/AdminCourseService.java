package com.zh.learnhub_api.services.admin;

import com.zh.learnhub_api.dtos.admin.AdminCourseContentDTO;
import com.zh.learnhub_api.configs.CacheNames;
import com.zh.learnhub_api.dtos.admin.AdminCourseContentDTO.AdminLessonContentDTO;
import com.zh.learnhub_api.dtos.course.CourseRejectRequestDTO;
import com.zh.learnhub_api.dtos.course.CourseResponseDTO;
import com.zh.learnhub_api.dtos.common.PageResponseDTO;
import com.zh.learnhub_api.enums.CourseStatus;
import com.zh.learnhub_api.enums.NotificationType;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.Course;
import com.zh.learnhub_api.pojo.CourseReject;
import com.zh.learnhub_api.pojo.Lesson;
import com.zh.learnhub_api.pojo.Question;
import com.zh.learnhub_api.pojo.Video;
import com.zh.learnhub_api.repositories.course.CourseRejectRepository;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import com.zh.learnhub_api.repositories.course.LessonRepository;
import com.zh.learnhub_api.repositories.course.QuestionRepository;
import com.zh.learnhub_api.repositories.media.VideoRepository;
import com.zh.learnhub_api.repositories.account.UserRepository;
import com.zh.learnhub_api.services.learning.VideoPlaybackService;
import com.zh.learnhub_api.services.notification.NotificationService;
import com.zh.learnhub_api.services.cache.ApplicationCacheInvalidator;
import com.zh.learnhub_api.services.realtime.CourseRealtimeAudience;
import com.zh.learnhub_api.services.realtime.CourseStatusChangedEvent;
import com.zh.learnhub_api.services.vector.CourseVectorIndexer.SyncEvent;
import com.zh.learnhub_api.mappers.CourseMapper;
import com.zh.learnhub_api.mappers.QuestionMapper;
import com.zh.learnhub_api.projections.course.CourseDetailProjection;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminCourseService {

    private final CourseRepository courseRepository;
    private final CourseRejectRepository courseRejectRepository;
    private final CourseMapper courseMapper;
    private final QuestionMapper questionMapper;

    private final LessonRepository lessonRepository;
    private final VideoRepository videoRepository;
    private final QuestionRepository questionRepository;
    private final VideoPlaybackService videoPlaybackService;
    private final ApplicationEventPublisher eventPublisher;
    private final ApplicationCacheInvalidator cacheInvalidator;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public AdminCourseContentDTO getCourseContent(Long courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khóa học"));

        List<Lesson> lessons = lessonRepository.findByCourseId_IdOrderByPositionAsc(courseId);

        Map<Long, List<Video>> videosByLesson = videoRepository.findPublicByCourseId(courseId)
                .stream()
                .collect(Collectors.groupingBy(video -> video.getLesson().getId()));

        Map<Long, List<Question>> questionsByLesson = questionRepository
                .findByCourseIdWithAnswers(courseId).stream()
                .collect(Collectors.groupingBy(question -> question.getLessonId().getId()));

        List<AdminLessonContentDTO> lessonDTOs = lessons.stream()
                .map(lesson -> new AdminLessonContentDTO(
                        lesson.getId(),
                        lesson.getTitle(),
                        lesson.getPosition(),
                        lesson.isPreview(),
                        videosByLesson.getOrDefault(lesson.getId(), List.of()).stream()
                                .map(videoPlaybackService::toPlayableVideo)
                                .collect(Collectors.toList()),
                        questionsByLesson.getOrDefault(lesson.getId(), List.of()).stream()

                                .sorted(Comparator.comparing(Question::getPosition,
                                            Comparator.nullsLast(Comparator.naturalOrder()))
                                        .thenComparing(Question::getId))
                                .map(q -> questionMapper.toDTO(q, q.getAnswerSet()))
                                .collect(Collectors.toList())))
                .collect(Collectors.toList());

        return new AdminCourseContentDTO(course.getId(), course.getTitle(), lessonDTOs);
    }

    public PageResponseDTO<CourseResponseDTO> listCourses(
            CourseStatus status, String category, String search, Pageable requestedPage) {

        Pageable pageable = PageRequest.of(
                requestedPage.getPageNumber(),
                requestedPage.getPageSize(),
                Sort.by(Sort.Direction.DESC, "updatedAt"));

        Page<CourseDetailProjection> coursePage = courseRepository.findFilteredCourseDetails(
            null,
            status,
            normalizeFilter(category),
            normalizeFilter(search),
            pageable);

        return PageResponseDTO.from(coursePage.map(courseMapper::mapDetailProjectionToDTO));
    }

    private String normalizeFilter(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    @Transactional
    public void approveCourse(Long courseId, Long adminId) {

        int updated = courseRepository.updateStatus(
            courseId,
            CourseStatus.PENDING,
            CourseStatus.PUBLISHED
        );

        if (updated == 0) {

            Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khóa học"));

            CourseStatus currentStatus = course.getStatus();
            throw new IllegalStateException(
                "Chỉ có thể duyệt khóa học ở trạng thái PENDING. " +
                "Trạng thái hiện tại: " + currentStatus
            );
        }

        Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khóa học"));
        notificationService.createCourseDecision(
            course,
            userRepository.getReferenceById(adminId),
            NotificationType.COURSE_APPROVED,
            "Khóa học đã được duyệt",
            "Khóa học \"" + course.getTitle() + "\" đã được duyệt và xuất bản."
        );
        eventPublisher.publishEvent(new CourseStatusChangedEvent(
            courseId,
            course.getInstructorId().getId(),
            CourseStatus.PUBLISHED,
            course.getTitle(),
            course.getCategoryId().getName(),
            CourseRealtimeAudience.INSTRUCTOR
        ));

        eventPublisher.publishEvent(new SyncEvent(courseId));
        cacheInvalidator.evictAfterCommit(
                CacheNames.PUBLIC_INSTRUCTOR_PROFILES,
                course.getInstructorId().getId());

    }

    @Transactional
    public void rejectCourse(
            Long courseId, CourseRejectRequestDTO request, Long adminId) {

        int updated = courseRepository.updateStatus(
            courseId,
            CourseStatus.PENDING,
            CourseStatus.REJECTED
        );

        if (updated == 0) {
            Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khóa học"));

            CourseStatus currentStatus = course.getStatus();
            throw new IllegalStateException(
                "Chỉ có thể từ chối khóa học ở trạng thái PENDING. " +
                "Trạng thái hiện tại: " + currentStatus
            );
        }

        Course course = courseRepository.findById(courseId).orElseThrow();
        CourseReject reject = new CourseReject();
        reject.setCourseId(course);
        reject.setComment(request.getComment());
        reject.setCreatedAt(LocalDateTime.now());
        courseRejectRepository.save(reject);

        notificationService.createCourseDecision(
            course,
            userRepository.getReferenceById(adminId),
            NotificationType.COURSE_REJECTED,
            "Khóa học chưa được duyệt",
            "Khóa học \"" + course.getTitle() + "\" đã bị từ chối."
        );
        eventPublisher.publishEvent(new CourseStatusChangedEvent(
            courseId,
            course.getInstructorId().getId(),
            CourseStatus.REJECTED,
            course.getTitle(),
            course.getCategoryId().getName(),
            CourseRealtimeAudience.INSTRUCTOR
        ));
    }

}
