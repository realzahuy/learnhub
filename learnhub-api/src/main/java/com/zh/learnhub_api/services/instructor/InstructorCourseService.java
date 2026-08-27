package com.zh.learnhub_api.services.instructor;

import com.zh.learnhub_api.configs.CacheConfiguration;
import com.zh.learnhub_api.dtos.common.PageResponseDTO;
import com.zh.learnhub_api.dtos.course.CourseCreateResponseDTO;
import com.zh.learnhub_api.dtos.course.CourseRejectResponseDTO;
import com.zh.learnhub_api.dtos.course.CourseResponseDTO;
import com.zh.learnhub_api.dtos.course.CourseUpsertRequestDTO;
import com.zh.learnhub_api.enums.CourseStatus;
import com.zh.learnhub_api.exceptions.ForbiddenException;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.mappers.CourseMapper;
import com.zh.learnhub_api.pojo.Category;
import com.zh.learnhub_api.pojo.Course;
import com.zh.learnhub_api.pojo.CourseReject;
import com.zh.learnhub_api.pojo.User;
import com.zh.learnhub_api.projections.course.CourseDetailProjection;
import com.zh.learnhub_api.repositories.account.UserRepository;
import com.zh.learnhub_api.repositories.course.CategoryRepository;
import com.zh.learnhub_api.repositories.course.CourseRejectRepository;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import com.zh.learnhub_api.services.cache.ApplicationCacheInvalidator;
import com.zh.learnhub_api.services.course.SlugService;
import com.zh.learnhub_api.services.media.ImageStorageService;
import com.zh.learnhub_api.services.media.MediaCleanupService;
import com.zh.learnhub_api.services.realtime.CourseRealtimeEventListener.Audience;
import com.zh.learnhub_api.services.realtime.CourseRealtimeEventListener.StatusChanged;
import com.zh.learnhub_api.services.vector.CourseVectorIndexer.PayloadSyncEvent;
import com.zh.learnhub_api.services.vector.CourseVectorIndexer.SyncEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InstructorCourseService {

    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final CourseRejectRepository courseRejectRepository;
    private final SlugService slugService;
    private final CourseMapper courseMapper;
    private final ImageStorageService imageStorageService;
    private final MediaCleanupService mediaCleanupService;
    private final ApplicationEventPublisher eventPublisher;
    private final ApplicationCacheInvalidator cacheInvalidator;

    @Transactional
    public CourseCreateResponseDTO createCourse(
            CourseUpsertRequestDTO request, Long instructorId, MultipartFile thumbnailFile) {
        User instructor = userRepository.getReferenceById(instructorId);
        Category category = categoryRepository
                .findById(request.getCategoryId())
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
            String thumbnailUrl = imageStorageService.uploadCourseThumbnail(thumbnailFile, savedCourse.getId());
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
        Course course = findOwnedCourse(courseId, instructorId);
        CourseStatus status = course.getStatus();
        if (status != CourseStatus.DRAFT && status != CourseStatus.REJECTED) {
            throw new IllegalArgumentException("Không thể xóa khóa học");
        }
        mediaCleanupService.scheduleCourseCleanup(courseId, course.getThumbnail() != null);
        courseRepository.delete(course);
    }

    @Transactional
    public CourseResponseDTO updateCourse(
            Long courseId, CourseUpsertRequestDTO request, Long instructorId, MultipartFile thumbnailFile) {
        Course course = findOwnedCourse(courseId, instructorId);
        CourseStatus statusBeforeUpdate = course.getStatus();
        String oldTitle = course.getTitle();
        String oldShortDescription = course.getShortDescription();
        String oldDescription = course.getDescription();

        applyUpdate(course, request);
        if (thumbnailFile != null && !thumbnailFile.isEmpty()) {
            String thumbnailUrl = imageStorageService.uploadCourseThumbnail(thumbnailFile, courseId);
            course.setThumbnail(thumbnailUrl);
        }
        Course updatedCourse = courseRepository.save(course);
        if (statusBeforeUpdate == CourseStatus.PUBLISHED) {
            cacheInvalidator.evictAfterCommit(CacheConfiguration.PUBLIC_COURSE_DETAILS, updatedCourse.getSlug());
        }
        boolean embeddingDataChanged = !Objects.equals(oldTitle, updatedCourse.getTitle())
                || !Objects.equals(oldShortDescription, updatedCourse.getShortDescription())
                || !Objects.equals(oldDescription, updatedCourse.getDescription());
        if (statusBeforeUpdate == CourseStatus.PUBLISHED) {
            if (embeddingDataChanged) {
                eventPublisher.publishEvent(new SyncEvent(courseId));
            } else {
                eventPublisher.publishEvent(new PayloadSyncEvent(courseId));
            }
        }
        return courseMapper.mapEntityToDTO(updatedCourse);
    }

    @Transactional
    public void submitCourse(Long courseId, Long instructorId) {
        Course course = findOwnedCourse(courseId, instructorId);
        CourseStatus currentStatus = course.getStatus();
        if (currentStatus != CourseStatus.DRAFT && currentStatus != CourseStatus.REJECTED) {
            throw new IllegalStateException("Không thể gửi kiểm duyệt");
        }
        String title = course.getTitle();
        String categoryName = course.getCategoryId().getName();
        course.setStatus(CourseStatus.PENDING);

        eventPublisher.publishEvent(
                new StatusChanged(courseId, instructorId, CourseStatus.PENDING, title, categoryName, Audience.ADMINS));
    }

    public CourseRejectResponseDTO getCourseRejectReason(Long courseId, Long instructorId) {
        Course course = findOwnedCourse(courseId, instructorId);
        if (course.getStatus() != CourseStatus.REJECTED) {
            throw new IllegalArgumentException("Trạng thái không hợp lệ");
        }

        CourseReject latestReject = courseRejectRepository
                .findTopByCourseId_IdOrderByCreatedAtDescIdDesc(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lý do"));
        return new CourseRejectResponseDTO(
                latestReject.getId(), latestReject.getComment(), latestReject.getCreatedAt());
    }

    public PageResponseDTO<CourseResponseDTO> getInstructorCourses(
            Long instructorId, CourseStatus status, String category, String search, Pageable requestedPage) {
        Pageable pageable = PageRequest.of(
                requestedPage.getPageNumber(), requestedPage.getPageSize(), Sort.by(Sort.Direction.DESC, "updatedAt"));

        Page<CourseDetailProjection> coursePage = courseRepository.findFilteredCourseDetails(
                instructorId, status, normalizeFilter(category), normalizeFilter(search), pageable);
        return PageResponseDTO.from(coursePage.map(courseMapper::mapDetailProjectionToDTO));
    }

    public CourseResponseDTO getInstructorCourseDetail(Long courseId, Long instructorId) {
        CourseDetailProjection projection = courseRepository
                .findInstructorCourseDetail(courseId, instructorId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khóa học"));
        return courseMapper.mapDetailProjectionToDTO(projection);
    }

    private void applyUpdate(Course course, CourseUpsertRequestDTO request) {
        switch (course.getStatus()) {
            case DRAFT, REJECTED -> updateAllFields(course, request);
            case PUBLISHED -> updatePublishedFields(course, request);
            case PENDING -> throw new IllegalArgumentException("Không thể chỉnh sửa");
        }
    }

    private void updateAllFields(Course course, CourseUpsertRequestDTO request) {
        applySafeFields(course, request);
        updateSlugIfChanged(course, request);
        updateCategoryIfChanged(course, request);
    }

    private void updatePublishedFields(Course course, CourseUpsertRequestDTO request) {
        Category currentCategory = requireCurrentCategory(course);

        if (request.getSlug() != null && !request.getSlug().isEmpty()) {
            String requestedSlug = request.getSlug().trim().toLowerCase();
            if (!requestedSlug.equals(course.getSlug())) {
                throw new IllegalArgumentException("Không thể đổi slug");
            }
        }

        if (!request.getCategoryId().equals(currentCategory.getId())) {
            throw new IllegalArgumentException("Không thể đổi danh mục");
        }

        applySafeFields(course, request);
    }

    private void applySafeFields(Course course, CourseUpsertRequestDTO request) {
        course.setTitle(request.getTitle());
        course.setShortDescription(request.getShortDescription());
        course.setDescription(request.getDescription());
        course.setThumbnail(request.getThumbnail());
        course.setPrice(request.getPrice());
    }

    private void updateSlugIfChanged(Course course, CourseUpsertRequestDTO request) {
        if (request.getSlug() == null || request.getSlug().trim().isEmpty()) {
            return;
        }

        String newSlug = slugService.processSlug(request.getSlug(), request.getTitle(), course.getId());
        if (!newSlug.equals(course.getSlug())) {
            course.setSlug(newSlug);
        }
    }

    private void updateCategoryIfChanged(Course course, CourseUpsertRequestDTO request) {
        Category currentCategory = requireCurrentCategory(course);
        if (!request.getCategoryId().equals(currentCategory.getId())) {
            Category newCategory = categoryRepository
                    .findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục"));
            course.setCategoryId(newCategory);
        }
    }

    private Category requireCurrentCategory(Course course) {
        if (course.getCategoryId() == null) {
            throw new IllegalStateException("Không có danh mục");
        }
        return course.getCategoryId();
    }

    private Course findOwnedCourse(Long courseId, Long instructorId) {
        Course course = courseRepository
                .findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khóa học"));
        if (!course.getInstructorId().getId().equals(instructorId)) {
            throw new ForbiddenException("Không có quyền");
        }
        return course;
    }

    private String normalizeFilter(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
