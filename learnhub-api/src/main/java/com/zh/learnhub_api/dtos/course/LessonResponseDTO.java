package com.zh.learnhub_api.dtos.course;

public record LessonResponseDTO(
        Long id,
        String title,
        Integer position,
        Boolean isPreview,
        Long courseId) {}
