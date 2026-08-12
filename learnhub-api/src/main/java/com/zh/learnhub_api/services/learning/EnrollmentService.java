package com.zh.learnhub_api.services.learning;

import com.zh.learnhub_api.dtos.common.PageResponseDTO;
import com.zh.learnhub_api.dtos.learning.EnrollmentResponseDTO;
import com.zh.learnhub_api.pojo.LessonProgress;
import com.zh.learnhub_api.projections.learning.EnrollmentListProjection;
import com.zh.learnhub_api.repositories.learning.EnrollmentRepository;
import com.zh.learnhub_api.repositories.learning.LessonProgressRepository;
import com.zh.learnhub_api.repositories.course.LessonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class EnrollmentService {

    private final EnrollmentRepository enrollmentRepository;

    private final LessonRepository lessonRepository;
    private final LessonProgressRepository lessonProgressRepository;

    @Transactional(readOnly = true)
    public boolean isEnrolled(Long userId, Long courseId) {
        return enrollmentRepository.existsByUserId_IdAndCourseId_Id(userId, courseId);
    }

    @Transactional(readOnly = true)
    public PageResponseDTO<EnrollmentResponseDTO> getEnrollmentsByUserId(
            Long userId, Pageable requestedPage) {

        Pageable pageable = PageRequest.of(
                requestedPage.getPageNumber(),
                requestedPage.getPageSize(),
                Sort.by(Sort.Direction.DESC, "enrolledAt"));
        Page<EnrollmentListProjection> enrollmentPage = enrollmentRepository
                .findListByUserId(userId, pageable);

        List<EnrollmentListProjection> enrollments = enrollmentPage.getContent();
        if (enrollments.isEmpty()) {
            return PageResponseDTO.from(enrollmentPage, List.of());
        }

        List<Long> courseIds = enrollments.stream()
            .map(EnrollmentListProjection::getCourseId)
            .collect(Collectors.toList());

        Map<Long, Integer> totalByCourse = lessonRepository.countGroupedByCourseIds(courseIds)
            .stream()
            .collect(Collectors.toMap(
                    row -> row.getCourseId(),
                    row -> row.getLessonCount().intValue()));

        Map<Long, Integer> completedByCourse = lessonProgressRepository
            .findByUserAndCourseIds(userId, courseIds).stream()
            .filter(LessonProgress::isCompleted)
            .collect(Collectors.groupingBy(
                progress -> progress.getLessonId().getCourseId().getId(),
                Collectors.summingInt(progress -> 1)));

        List<EnrollmentResponseDTO> content = enrollments.stream()
            .map(enrollment -> {
                Long courseId = enrollment.getCourseId();
                return EnrollmentResponseDTO.builder()
                    .enrollmentId(enrollment.getEnrollmentId())
                    .courseId(courseId)
                    .courseTitle(enrollment.getCourseTitle())
                    .courseSlug(enrollment.getCourseSlug())
                    .courseThumbnail(enrollment.getCourseThumbnail())
                    .instructorName(enrollment.getInstructorName())
                    .completedLessons(completedByCourse.getOrDefault(courseId, 0))
                    .totalLessons(totalByCourse.getOrDefault(courseId, 0))
                    .enrolledAt(enrollment.getEnrolledAt())
                    .build();
            })
            .collect(Collectors.toList());

        return PageResponseDTO.from(enrollmentPage, content);
    }
}
