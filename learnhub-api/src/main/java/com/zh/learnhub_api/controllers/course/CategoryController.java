package com.zh.learnhub_api.controllers.course;

import com.zh.learnhub_api.dtos.course.CategoryRequestDTO;
import com.zh.learnhub_api.dtos.course.CategoryResponseDTO;
import com.zh.learnhub_api.services.course.CategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    public List<CategoryResponseDTO> getAllCategories() {
        return categoryService.getAllCategories();
    }

    @PostMapping
    public ResponseEntity<CategoryResponseDTO> createCategory(
            @Valid @RequestBody CategoryRequestDTO requestDTO) {
        CategoryResponseDTO savedCategory = categoryService.createCategory(requestDTO);
        return new ResponseEntity<>(savedCategory, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoryResponseDTO> updateCategory(
            @PathVariable Short id, 
            @Valid @RequestBody CategoryRequestDTO requestDTO) {
        CategoryResponseDTO updatedCategory = categoryService.updateCategory(id, requestDTO);
        return ResponseEntity.ok(updatedCategory);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Short id) {
        categoryService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }
}
