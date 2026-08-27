package com.zh.learnhub_api.dtos.learning;

import java.time.LocalDateTime;

public record FreeEnrollmentResponseDTO(
        Long enrollmentId,
        Long courseId,
        String courseTitle,
        String courseSlug,
        LocalDateTime enrolledAt,
        String message) {}
