package com.zh.learnhub_api.controllers.learning;

import com.zh.learnhub_api.dtos.common.PageResponseDTO;
import com.zh.learnhub_api.dtos.learning.*;
import com.zh.learnhub_api.security.AuthenticatedUserPrincipal;
import com.zh.learnhub_api.services.learning.EnrollmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/enrollments")
@RequiredArgsConstructor
public class EnrollmentController {

    private final EnrollmentService enrollmentService;

    @PostMapping("/free/{courseId}")
    public FreeEnrollmentResponseDTO enrollFreeCourse(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @PathVariable Long courseId) {
        return enrollmentService.enrollFreeCourse(principal.getUserId(), courseId);
    }

    @GetMapping
    public PageResponseDTO<EnrollmentResponseDTO> getMyEnrollments(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String search,
        Pageable pageable
    ) {
        return enrollmentService.getEnrollmentsByUserId(principal.getUserId(), category, search, pageable);
    }

    @GetMapping("/check")
    public EnrollmentStatusDTO checkEnrolled(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @RequestParam Long courseId
    ) {
        return new EnrollmentStatusDTO(enrollmentService.isEnrolled(principal.getUserId(), courseId));
    }

    @PostMapping("/check-batch")
    public EnrollmentBatchStatusDTO checkEnrolledBatch(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @Valid @RequestBody EnrollmentBatchCheckRequestDTO request) {
        return new EnrollmentBatchStatusDTO(
                enrollmentService.findEnrolledCourseIds(principal.getUserId(), request.courseIds()));
    }
}
