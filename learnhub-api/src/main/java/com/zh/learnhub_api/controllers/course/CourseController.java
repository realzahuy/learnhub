package com.zh.learnhub_api.controllers.course;

import com.zh.learnhub_api.dtos.course.CourseListItemDTO;
import com.zh.learnhub_api.dtos.course.PublicCourseDetailDTO;
import com.zh.learnhub_api.dtos.common.PageResponseDTO;
import com.zh.learnhub_api.services.course.CourseCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class CourseController {

    private final CourseCatalogService courseCatalogService;

    @GetMapping
    public ResponseEntity<PageResponseDTO<CourseListItemDTO>> getPublishedCourses(
            Pageable pageable,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "newest") String sort) {

        PageResponseDTO<CourseListItemDTO> response = courseCatalogService.getPublishedCourses(
                search, category, sort, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{slug}")
    public ResponseEntity<PublicCourseDetailDTO> getCourseBySlug(@PathVariable String slug) {
        PublicCourseDetailDTO response = courseCatalogService.getPublishedCourseBySlug(slug);
        return ResponseEntity.ok(response);
    }
}
