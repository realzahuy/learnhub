package com.zh.learnhub_api.services.learning;

import com.zh.learnhub_api.dtos.common.PageResponseDTO;
import com.zh.learnhub_api.dtos.learning.EnrollmentResponseDTO;
import com.zh.learnhub_api.dtos.learning.FreeEnrollmentResponseDTO;
import com.zh.learnhub_api.enums.CourseStatus;
import com.zh.learnhub_api.exceptions.DuplicateResourceException;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.Course;
import com.zh.learnhub_api.pojo.Enrollment;
import com.zh.learnhub_api.pojo.LessonProgress;
import com.zh.learnhub_api.pojo.User;
import com.zh.learnhub_api.projections.learning.EnrollmentListProjection;
import com.zh.learnhub_api.repositories.account.UserRepository;
import com.zh.learnhub_api.repositories.course.CourseRepository;
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
import java.util.Set;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class EnrollmentService {

    private final EnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final LessonRepository lessonRepository;
    private final LessonProgressRepository lessonProgressRepository;

    public FreeEnrollmentResponseDTO enrollFreeCourse(Long userId, Long courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khóa học"));
        if (!CourseStatus.PUBLISHED.name().equals(course.getStatus())) {
            throw new IllegalStateException("Khóa học không khả dụng để đăng ký");
        }
        if (course.getPrice() == null) {
            throw new IllegalStateException("Khóa học chưa có giá");
        }
        if (course.getPrice().compareTo(BigDecimal.ZERO) != 0) {
            throw new IllegalArgumentException("Chỉ có thể đăng ký trực tiếp khóa học miễn phí");
        }

        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
        if (enrollmentRepository.existsByUserId_IdAndCourseId_Id(userId, courseId)) {
            throw new DuplicateResourceException("Bạn đã đăng ký khóa học này");
        }

        LocalDateTime enrolledAt = LocalDateTime.now();
        Enrollment enrollment = new Enrollment();
        enrollment.setUserId(user);
        enrollment.setCourseId(course);
        enrollment.setEnrolledAt(enrolledAt);
        Enrollment saved = enrollmentRepository.save(enrollment);

        return new FreeEnrollmentResponseDTO(
                saved.getId(),
                course.getId(),
                course.getTitle(),
                course.getSlug(),
                enrolledAt,
                "Đã thêm khóa học miễn phí vào tài khoản.");
    }

    @Transactional(readOnly = true)
    public boolean isEnrolled(Long userId, Long courseId) {
        return enrollmentRepository.existsByUserId_IdAndCourseId_Id(userId, courseId);
    }

    @Transactional(readOnly = true)
    public Set<Long> findEnrolledCourseIds(Long userId, List<Long> courseIds) {
        List<Long> distinctCourseIds = courseIds.stream().distinct().toList();
        if (distinctCourseIds.isEmpty()) {
            return Set.of();
        }
        return enrollmentRepository.findCourseIdsByUserIdAndCourseIds(
                userId, distinctCourseIds);
    }

    @Transactional(readOnly = true)
    public PageResponseDTO<EnrollmentResponseDTO> getEnrollmentsByUserId(
            Long userId, String category, String search, Pageable requestedPage) {

        Pageable pageable = PageRequest.of(
                requestedPage.getPageNumber(),
                requestedPage.getPageSize(),
                Sort.by(Sort.Direction.DESC, "enrolledAt"));
        Page<EnrollmentListProjection> enrollmentPage = enrollmentRepository
                .findListByUserId(
                        userId,
                        normalizeFilter(category),
                        normalizeFilter(search),
                        pageable);

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
                    .categoryName(enrollment.getCategoryName())
                    .completedLessons(completedByCourse.getOrDefault(courseId, 0))
                    .totalLessons(totalByCourse.getOrDefault(courseId, 0))
                    .enrolledAt(enrollment.getEnrolledAt())
                    .build();
            })
            .collect(Collectors.toList());

        return PageResponseDTO.from(enrollmentPage, content);
    }

    private String normalizeFilter(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
