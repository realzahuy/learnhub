package com.zh.learnhub_api.controllers.learning;

import com.zh.learnhub_api.dtos.common.PageResponseDTO;
import com.zh.learnhub_api.dtos.learning.EnrollmentResponseDTO;
import com.zh.learnhub_api.dtos.learning.EnrollmentStatusDTO;
import com.zh.learnhub_api.security.AuthenticatedUserPrincipal;
import com.zh.learnhub_api.services.learning.EnrollmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/enrollments")
@RequiredArgsConstructor
public class EnrollmentController {

    private final EnrollmentService enrollmentService;

    @GetMapping
    public ResponseEntity<PageResponseDTO<EnrollmentResponseDTO>> getMyEnrollments(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        Pageable pageable
    ) {
        return ResponseEntity.ok(enrollmentService.getEnrollmentsByUserId(
                principal.getUserId(), pageable));
    }

    @GetMapping("/check")
    public ResponseEntity<EnrollmentStatusDTO> checkEnrolled(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @RequestParam Long courseId
    ) {
        return ResponseEntity.ok(new EnrollmentStatusDTO(
                enrollmentService.isEnrolled(principal.getUserId(), courseId)));
    }
}
