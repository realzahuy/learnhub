package com.zh.learnhub_api.dtos.course;

public record CourseModerationResponseDTO(
        Long courseId,
        String newStatus,
        String message) {
}
