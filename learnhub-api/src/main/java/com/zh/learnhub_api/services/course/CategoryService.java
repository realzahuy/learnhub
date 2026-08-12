package com.zh.learnhub_api.services.course;

import com.zh.learnhub_api.dtos.course.CategoryRequestDTO;
import com.zh.learnhub_api.dtos.course.CategoryResponseDTO;
import com.zh.learnhub_api.exceptions.DuplicateResourceException;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.Category;
import com.zh.learnhub_api.repositories.course.CategoryRepository;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class CategoryService {

    private final CategoryRepository categoryRepository;

    private final CourseRepository courseRepository;

    @Transactional(readOnly = true)
    public List<CategoryResponseDTO> getAllCategories() {
        return categoryRepository.findAll().stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    public CategoryResponseDTO createCategory(CategoryRequestDTO requestDTO) {
        String name = requestDTO.getName().trim();
        if (categoryRepository.existsByNameIgnoreCase(name)) {
            throw new DuplicateResourceException("Danh mục \"" + name + "\" đã tồn tại");
        }

        Category category = new Category();
        category.setName(name);

        Category savedCategory = categoryRepository.save(category);
        return convertToResponseDTO(savedCategory);
    }

    public CategoryResponseDTO updateCategory(Short id, CategoryRequestDTO requestDTO) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với mã: " + id));

        String name = requestDTO.getName().trim();

        if (categoryRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new DuplicateResourceException("Danh mục \"" + name + "\" đã tồn tại");
        }

        category.setName(name);

        Category updatedCategory = categoryRepository.save(category);
        return convertToResponseDTO(updatedCategory);
    }

    public void deleteCategory(Short id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với mã: " + id));

        long courseCount = courseRepository.countByCategoryId_Id(id);
        if (courseCount > 0) {
            throw new IllegalArgumentException(
                "Không thể xóa danh mục \"" + category.getName() + "\" vì đang có "
                + courseCount + " khóa học thuộc danh mục này. "
                + "Hãy chuyển các khóa học đó sang danh mục khác trước."
            );
        }

        categoryRepository.delete(category);
    }

    private CategoryResponseDTO convertToResponseDTO(Category category) {
        CategoryResponseDTO dto = new CategoryResponseDTO();
        dto.setId(category.getId());
        dto.setName(category.getName());
        return dto;
    }
}
