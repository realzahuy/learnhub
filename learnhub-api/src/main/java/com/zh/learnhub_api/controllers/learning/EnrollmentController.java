package com.zh.learnhub_api.controllers.learning;

import com.zh.learnhub_api.dtos.common.PageResponseDTO;
import com.zh.learnhub_api.dtos.learning.*;
import com.zh.learnhub_api.security.AuthenticatedUserPrincipal;
import com.zh.learnhub_api.services.learning.EnrollmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/enrollments")
@RequiredArgsConstructor
public class EnrollmentController {

    private final EnrollmentService enrollmentService;

    @PostMapping("/free/{courseId}")
    public ResponseEntity<FreeEnrollmentResponseDTO> enrollFreeCourse(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @PathVariable Long courseId) {
        return ResponseEntity.ok(
                enrollmentService.enrollFreeCourse(principal.getUserId(), courseId));
    }

    @GetMapping
    public ResponseEntity<PageResponseDTO<EnrollmentResponseDTO>> getMyEnrollments(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String search,
        Pageable pageable
    ) {
        return ResponseEntity.ok(enrollmentService.getEnrollmentsByUserId(
                principal.getUserId(), category, search, pageable));
    }

    @GetMapping("/check")
    public ResponseEntity<EnrollmentStatusDTO> checkEnrolled(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @RequestParam Long courseId
    ) {
        return ResponseEntity.ok(new EnrollmentStatusDTO(
                enrollmentService.isEnrolled(principal.getUserId(), courseId)));
    }

    @PostMapping("/check-batch")
    public ResponseEntity<EnrollmentBatchStatusDTO> checkEnrolledBatch(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @Valid @RequestBody EnrollmentBatchCheckRequestDTO request) {
        return ResponseEntity.ok(new EnrollmentBatchStatusDTO(
                enrollmentService.findEnrolledCourseIds(
                        principal.getUserId(), request.courseIds())));
    }
}
