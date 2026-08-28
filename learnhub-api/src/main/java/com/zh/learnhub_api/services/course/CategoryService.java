package com.zh.learnhub_api.services.course;

import com.zh.learnhub_api.configs.CacheConfiguration;
import com.zh.learnhub_api.dtos.course.CategoryRequestDTO;
import com.zh.learnhub_api.dtos.course.CategoryResponseDTO;
import com.zh.learnhub_api.exceptions.DuplicateResourceException;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.Category;
import com.zh.learnhub_api.repositories.course.CategoryRepository;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import com.zh.learnhub_api.services.cache.ApplicationCacheInvalidator;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CategoryService {

    private final CategoryRepository categoryRepository;

    private final CourseRepository courseRepository;
    private final ApplicationCacheInvalidator cacheInvalidator;

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheConfiguration.CATEGORIES, key = "'all'", sync = true)
    public List<CategoryResponseDTO> getAllCategories() {
        return categoryRepository.findAll().stream()
                .map(this::convertToResponseDTO)
                .toList();
    }

    public CategoryResponseDTO createCategory(CategoryRequestDTO requestDTO) {
        String name = requestDTO.getName().trim();
        if (categoryRepository.existsByNameIgnoreCase(name)) {
            throw new DuplicateResourceException("Danh mục đã tồn tại");
        }

        Category category = new Category();
        category.setName(name);

        Category savedCategory = categoryRepository.save(category);
        cacheInvalidator.clearAfterCommit(CacheConfiguration.CATEGORIES);
        return convertToResponseDTO(savedCategory);
    }

    public CategoryResponseDTO updateCategory(Short id, CategoryRequestDTO requestDTO) {
        Category category = categoryRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục"));

        String name = requestDTO.getName().trim();

        if (categoryRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new DuplicateResourceException("Danh mục đã tồn tại");
        }

        category.setName(name);

        cacheInvalidator.clearAfterCommit(CacheConfiguration.CATEGORIES, CacheConfiguration.PUBLIC_COURSE_DETAILS);
        return convertToResponseDTO(category);
    }

    public void deleteCategory(Short id) {
        Category category = categoryRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục"));

        long courseCount = courseRepository.countByCategoryId_Id(id);
        if (courseCount > 0) {
            throw new IllegalArgumentException("Không thể xóa danh mục vì còn khóa học");
        }

        categoryRepository.delete(category);
        cacheInvalidator.clearAfterCommit(CacheConfiguration.CATEGORIES);
    }

    private CategoryResponseDTO convertToResponseDTO(Category category) {
        return new CategoryResponseDTO(category.getId(), category.getName());
    }
}
