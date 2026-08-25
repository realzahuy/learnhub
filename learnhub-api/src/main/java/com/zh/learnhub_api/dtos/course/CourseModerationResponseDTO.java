package com.zh.learnhub_api.dtos.course;

import com.zh.learnhub_api.enums.CourseStatus;

public record CourseModerationResponseDTO(
        Long courseId,
        CourseStatus newStatus,
        String message) {
}
