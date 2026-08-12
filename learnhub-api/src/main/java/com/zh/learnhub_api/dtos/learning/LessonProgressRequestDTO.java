package com.zh.learnhub_api.dtos.learning;

import jakarta.validation.constraints.NotNull;

public record LessonProgressRequestDTO(
        @NotNull(message = "Trạng thái hoàn thành không được để trống")
        Boolean completed) {
}
