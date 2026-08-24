package com.zh.learnhub_api.dtos.media;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VideoTitleRequestDTO(@NotBlank(message = "Tên video không được để trống") @Size(max = 255, message = "Tên video không được vượt quá 255 ký tự") String title) {
}
