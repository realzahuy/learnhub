package com.zh.learnhub_api.services.course;

import com.zh.learnhub_api.dtos.course.CourseUpsertRequestDTO;
import com.zh.learnhub_api.enums.CourseStatus;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.Category;
import com.zh.learnhub_api.pojo.Course;
import com.zh.learnhub_api.repositories.course.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CourseUpdatePolicy {

    private final CategoryRepository categoryRepository;
    private final SlugService slugService;

    public void applyUpdate(Course course, CourseUpsertRequestDTO request) {
        CourseStatus status = course.getStatus();

        switch (status) {
            case DRAFT, REJECTED -> updateAllFields(course, request);
            case PUBLISHED -> updatePublishedFields(course, request);
            case PENDING -> throw new IllegalArgumentException(
                    "Không thể chỉnh sửa khóa học ở trạng thái " + course.getStatus());
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
                throw new IllegalArgumentException(
                        "Không thể thay đổi slug của khóa học đã xuất bản. "
                                + "Slug hiện tại: " + course.getSlug());
            }
        }

        Short currentCategoryId = currentCategory.getId();
        if (!request.getCategoryId().equals(currentCategoryId)) {
            throw new IllegalArgumentException(
                    "Không thể thay đổi danh mục của khóa học đã xuất bản. "
                            + "Danh mục hiện tại: " + currentCategory.getName());
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

        String newSlug = slugService.processSlug(
                request.getSlug(),
                request.getTitle(),
                course.getId());

        if (!newSlug.equals(course.getSlug())) {
            course.setSlug(newSlug);
        }
    }

    private void updateCategoryIfChanged(Course course, CourseUpsertRequestDTO request) {
        Category currentCategory = requireCurrentCategory(course);
        Short currentCategoryId = currentCategory.getId();

        if (!request.getCategoryId().equals(currentCategoryId)) {
            Category newCategory = categoryRepository
                    .findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục"));
            course.setCategoryId(newCategory);
        }
    }

    private Category requireCurrentCategory(Course course) {
        if (course.getCategoryId() == null) {
            throw new IllegalStateException("Khóa học không có danh mục");
        }
        return course.getCategoryId();
    }
}
