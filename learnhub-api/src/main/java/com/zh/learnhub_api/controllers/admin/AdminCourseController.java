package com.zh.learnhub_api.controllers.admin;

import com.zh.learnhub_api.dtos.admin.AdminCourseContentDTO;
import com.zh.learnhub_api.dtos.common.PageResponseDTO;
import com.zh.learnhub_api.dtos.course.CourseRejectRequestDTO;
import com.zh.learnhub_api.dtos.course.CourseResponseDTO;
import com.zh.learnhub_api.enums.CourseStatus;
import com.zh.learnhub_api.security.AuthenticatedUserPrincipal;
import com.zh.learnhub_api.services.admin.AdminCourseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/courses")
@RequiredArgsConstructor
public class AdminCourseController {

    private final AdminCourseService adminCourseService;

    @GetMapping
    public PageResponseDTO<CourseResponseDTO> listCourses(
            @RequestParam(defaultValue = "PENDING") CourseStatus status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            Pageable pageable) {

        return adminCourseService.listCourses(status, category, search, pageable);
    }

    @GetMapping("/{id}/content")
    public AdminCourseContentDTO getCourseContent(@PathVariable Long id) {
        return adminCourseService.getCourseContent(id);
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<Void> approveCourse(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        adminCourseService.approveCourse(id, principal.getUserId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<Void> rejectCourse(
            @PathVariable Long id,
            @Valid @RequestBody CourseRejectRequestDTO request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        adminCourseService.rejectCourse(id, request, principal.getUserId());
        return ResponseEntity.noContent().build();
    }
}
