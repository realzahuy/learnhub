package com.zh.learnhub_api.dtos.learning;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;

public record EnrollmentBatchCheckRequestDTO(
        @NotEmpty(message = "Danh sách khóa học không được để trống")
        @Size(max = 20, message = "Chỉ được kiểm tra tối đa 20 khóa học")
        List<@NotNull @Positive Long> courseIds) {
}
