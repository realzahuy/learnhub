package com.zh.learnhub_api.services.instructor;

import com.zh.learnhub_api.dtos.common.PageResponseDTO;
import com.zh.learnhub_api.configs.CacheNames;
import com.zh.learnhub_api.dtos.course.CourseCreateResponseDTO;
import com.zh.learnhub_api.dtos.course.CourseRejectResponseDTO;
import com.zh.learnhub_api.dtos.course.CourseUpsertRequestDTO;
import com.zh.learnhub_api.dtos.course.CourseResponseDTO;
import com.zh.learnhub_api.enums.CourseStatus;
import com.zh.learnhub_api.exceptions.ForbiddenException;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.Category;
import com.zh.learnhub_api.pojo.Course;
import com.zh.learnhub_api.pojo.CourseReject;
import com.zh.learnhub_api.pojo.User;
import com.zh.learnhub_api.repositories.course.CategoryRepository;
import com.zh.learnhub_api.repositories.course.CourseRejectRepository;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import com.zh.learnhub_api.repositories.course.LessonRepository;
import com.zh.learnhub_api.repositories.account.UserRepository;
import com.zh.learnhub_api.services.course.CourseUpdatePolicy;
import com.zh.learnhub_api.services.cache.ApplicationCacheInvalidator;
import com.zh.learnhub_api.services.course.SlugService;
import com.zh.learnhub_api.services.media.ImageStorageService;
import com.zh.learnhub_api.services.media.MediaCleanupService;
import com.zh.learnhub_api.services.realtime.CourseRealtimeAudience;
import com.zh.learnhub_api.services.realtime.CourseStatusChangedEvent;
import com.zh.learnhub_api.services.vector.CourseVectorIndexer.SyncEvent;
import com.zh.learnhub_api.mappers.CourseMapper;
import com.zh.learnhub_api.projections.course.CourseDetailProjection;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InstructorCourseService {

    private final CourseRepository courseRepository;
    private final LessonRepository lessonRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final CourseRejectRepository courseRejectRepository;
    private final CourseUpdatePolicy courseUpdatePolicy;
    private final SlugService slugService;
    private final CourseMapper courseMapper;
    private final ImageStorageService imageStorageService;
    private final MediaCleanupService mediaCleanupService;
    private final ApplicationEventPublisher eventPublisher;
    private final ApplicationCacheInvalidator cacheInvalidator;

    @Transactional
    public CourseCreateResponseDTO createCourse(
            CourseUpsertRequestDTO request,
            Long instructorId,
            MultipartFile thumbnailFile) {
        User instructor = userRepository.getReferenceById(instructorId);
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục"));
        String slug = slugService.processSlug(request.getSlug(), request.getTitle(), null);

        Course course = new Course();
        course.setTitle(request.getTitle());
        course.setSlug(slug);
        course.setShortDescription(request.getShortDescription());
        course.setDescription(request.getDescription());
        course.setThumbnail(request.getThumbnail());
        course.setPrice(request.getPrice());
        course.setStatus(CourseStatus.DRAFT);
        course.setInstructorId(instructor);
        course.setCategoryId(category);

        Course savedCourse = courseRepository.save(course);
        if (thumbnailFile != null && !thumbnailFile.isEmpty()) {
            String thumbnailUrl = imageStorageService
                    .uploadCourseThumbnail(thumbnailFile, savedCourse.getId())
                    .secureUrl();
            savedCourse.setThumbnail(thumbnailUrl);
        }
        return new CourseCreateResponseDTO(
                savedCourse.getId(),
                savedCourse.getTitle(),
                savedCourse.getPrice(),
                savedCourse.getThumbnail(),
                savedCourse.getShortDescription(),
                category.getName());
    }

    @Transactional
    public void deleteCourse(Long courseId, Long instructorId) {
        Course course = findOwnedCourse(courseId, instructorId, "xóa");
        CourseStatus status = course.getStatus();
        if (status != CourseStatus.DRAFT && status != CourseStatus.REJECTED) {
            throw new IllegalArgumentException(
                    "Chỉ có thể xóa khóa học ở trạng thái DRAFT hoặc REJECTED. "
                            + "Trạng thái hiện tại: " + status);
        }
        mediaCleanupService.scheduleCourseCleanup(courseId, course.getThumbnail() != null);
        courseRepository.delete(course);
    }

    @Transactional
    public CourseResponseDTO updateCourse(
            Long courseId,
            CourseUpsertRequestDTO request,
            Long instructorId,
            MultipartFile thumbnailFile) {
        Course course = findOwnedCourse(courseId, instructorId, "chỉnh sửa");
        CourseStatus statusBeforeUpdate = course.getStatus();
        String oldTitle = course.getTitle();
        String oldShortDescription = course.getShortDescription();
        String oldDescription = course.getDescription();
        String oldThumbnail = course.getThumbnail();
        BigDecimal oldPrice = course.getPrice();

        courseUpdatePolicy.applyUpdate(course, request);
        if (thumbnailFile != null && !thumbnailFile.isEmpty()) {
            String thumbnailUrl = imageStorageService
                    .uploadCourseThumbnail(thumbnailFile, courseId)
                    .secureUrl();
            course.setThumbnail(thumbnailUrl);
        }
        Course updatedCourse = courseRepository.save(course);
        if (statusBeforeUpdate == CourseStatus.PUBLISHED) {
            cacheInvalidator.evictAfterCommit(
                    CacheNames.PUBLIC_COURSE_DETAILS,
                    updatedCourse.getSlug());
        }
        boolean indexedCourseDataChanged = !Objects.equals(oldTitle, updatedCourse.getTitle())
                || !Objects.equals(oldShortDescription, updatedCourse.getShortDescription())
                || !Objects.equals(oldDescription, updatedCourse.getDescription())
                || !Objects.equals(oldThumbnail, updatedCourse.getThumbnail())
                || !Objects.equals(oldPrice, updatedCourse.getPrice());
        if (statusBeforeUpdate == CourseStatus.PUBLISHED && indexedCourseDataChanged) {
            eventPublisher.publishEvent(new SyncEvent(courseId));
        }
        return mapToDTO(updatedCourse);
    }

    @Transactional
    public void submitCourse(Long courseId, Long instructorId) {
        Course course = findOwnedCourse(courseId, instructorId, "gửi kiểm duyệt");
        CourseStatus currentStatus = course.getStatus();
        if (currentStatus != CourseStatus.DRAFT && currentStatus != CourseStatus.REJECTED) {
            throw new IllegalStateException(
                    "Chỉ có thể gửi kiểm duyệt khóa học ở trạng thái DRAFT hoặc REJECTED");
        }
        if (!lessonRepository.existsByCourseId_Id(courseId)) {
            throw new IllegalStateException(
                    "Khóa học phải có ít nhất một bài giảng trước khi gửi kiểm duyệt");
        }

        String title = course.getTitle();
        String categoryName = course.getCategoryId().getName();
        int updated = courseRepository.submitForReview(
                courseId,
                instructorId,
                List.of(CourseStatus.DRAFT, CourseStatus.REJECTED),
                CourseStatus.PENDING);
        if (updated == 0) {
            throw new IllegalStateException(
                    "Khóa học đã thay đổi; vui lòng tải lại trước khi gửi kiểm duyệt");
        }

        eventPublisher.publishEvent(new CourseStatusChangedEvent(
                courseId,
                instructorId,
                CourseStatus.PENDING,
                title,
                categoryName,
                CourseRealtimeAudience.ADMINS));
    }

    public CourseRejectResponseDTO getCourseRejectReason(Long courseId, Long instructorId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khóa học"));
        if (!course.getInstructorId().getId().equals(instructorId)) {
            throw new ForbiddenException("Bạn không có quyền xem thông tin này");
        }
        if (course.getStatus() != CourseStatus.REJECTED) {
            throw new IllegalArgumentException("Khóa học này không ở trạng thái REJECTED");
        }

        CourseReject latestReject = courseRejectRepository
                .findTopByCourseId_IdOrderByCreatedAtDescIdDesc(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lý do từ chối"));
        return new CourseRejectResponseDTO(
                latestReject.getId(), latestReject.getComment(), latestReject.getCreatedAt());
    }

    public PageResponseDTO<CourseResponseDTO> getInstructorCourses(
            Long instructorId,
            CourseStatus status,
            String category,
            String search,
            Pageable requestedPage) {
        Pageable pageable = PageRequest.of(
                requestedPage.getPageNumber(),
                requestedPage.getPageSize(),
                Sort.by(Sort.Direction.DESC, "updatedAt"));

        Page<CourseDetailProjection> coursePage = courseRepository.findFilteredCourseDetails(
                instructorId,
                status,
                normalizeFilter(category),
                normalizeFilter(search),
                pageable);
        return PageResponseDTO.from(coursePage.map(courseMapper::mapDetailProjectionToDTO));
    }

    public CourseResponseDTO getInstructorCourseDetail(Long courseId, Long instructorId) {
        CourseDetailProjection projection = courseRepository.findInstructorCourseDetail(courseId, instructorId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khóa học"));
        return courseMapper.mapDetailProjectionToDTO(projection);
    }

    private Course findOwnedCourse(Long courseId, Long instructorId, String action) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khóa học"));
        if (!course.getInstructorId().getId().equals(instructorId)) {
            throw new ForbiddenException("Bạn không có quyền " + action + " khóa học này");
        }
        return course;
    }

    private CourseResponseDTO mapToDTO(Course course) {
        CourseResponseDTO dto = new CourseResponseDTO();
        dto.setId(course.getId());
        dto.setTitle(course.getTitle());
        dto.setSlug(course.getSlug());
        dto.setShortDescription(course.getShortDescription());
        dto.setDescription(course.getDescription());
        dto.setThumbnail(course.getThumbnail());
        dto.setPrice(course.getPrice());
        dto.setStatus(course.getStatus());
        dto.setCreatedAt(course.getCreatedAt());
        dto.setUpdatedAt(course.getUpdatedAt());
        if (course.getInstructorId() != null) {
            dto.setInstructorId(course.getInstructorId().getId());
            dto.setInstructorName(course.getInstructorId().getFullName());
        }
        if (course.getCategoryId() != null) {
            dto.setCategoryId(course.getCategoryId().getId().longValue());
            dto.setCategoryName(course.getCategoryId().getName());
        }
        return dto;
    }

    private String normalizeFilter(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
