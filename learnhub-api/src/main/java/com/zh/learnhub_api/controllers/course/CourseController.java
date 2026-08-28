package com.zh.learnhub_api.controllers.course;

import com.zh.learnhub_api.dtos.common.PageResponseDTO;
import com.zh.learnhub_api.dtos.course.CourseListItemDTO;
import com.zh.learnhub_api.dtos.course.PublicCourseDetailDTO;
import com.zh.learnhub_api.services.course.CourseCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class CourseController {

    private final CourseCatalogService courseCatalogService;

    @GetMapping
    public PageResponseDTO<CourseListItemDTO> getPublishedCourses(
            Pageable pageable,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "newest") String sort) {

        return courseCatalogService.getPublishedCourses(search, category, sort, pageable);
    }

    @GetMapping("/{slug}")
    public PublicCourseDetailDTO getCourseBySlug(@PathVariable String slug) {
        return courseCatalogService.getPublishedCourseBySlug(slug);
    }
}
