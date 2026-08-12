package com.zh.learnhub_api.controllers.admin;

import com.zh.learnhub_api.dtos.admin.AdminCourseContentDTO;
import com.zh.learnhub_api.dtos.course.CourseRejectRequestDTO;
import com.zh.learnhub_api.dtos.course.CourseModerationResponseDTO;
import com.zh.learnhub_api.dtos.course.CourseResponseDTO;
import com.zh.learnhub_api.enums.CourseStatus;
import com.zh.learnhub_api.dtos.common.PageResponseDTO;
import com.zh.learnhub_api.services.admin.AdminCourseService;
import com.zh.learnhub_api.security.AuthenticatedUserPrincipal;
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
    public ResponseEntity<PageResponseDTO<CourseResponseDTO>> listCourses(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            Pageable pageable) {

        PageResponseDTO<CourseResponseDTO> response =
            adminCourseService.listCourses(status, category, search, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/content")
    public ResponseEntity<AdminCourseContentDTO> getCourseContent(@PathVariable Long id) {
        return ResponseEntity.ok(adminCourseService.getCourseContent(id));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<CourseModerationResponseDTO> approveCourse(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        adminCourseService.approveCourse(id, principal.getUserId());
        return ResponseEntity.ok(new CourseModerationResponseDTO(
                id, CourseStatus.PUBLISHED.name(), "Duyệt khóa học thành công"));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<CourseModerationResponseDTO> rejectCourse(
            @PathVariable Long id,
            @Valid @RequestBody CourseRejectRequestDTO request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        adminCourseService.rejectCourse(id, request, principal.getUserId());
        return ResponseEntity.ok(new CourseModerationResponseDTO(
                id, CourseStatus.REJECTED.name(), "Từ chối khóa học thành công"));
    }
}
