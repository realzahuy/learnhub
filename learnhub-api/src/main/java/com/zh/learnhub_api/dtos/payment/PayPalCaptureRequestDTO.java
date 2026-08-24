package com.zh.learnhub_api.dtos.payment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PayPalCaptureRequestDTO(
        @NotBlank(message = "Mã đơn PayPal không được để trống")
        @Size(max = 64, message = "Mã đơn PayPal không hợp lệ")
        @Pattern(regexp = "[A-Za-z0-9-]+", message = "Mã đơn PayPal không hợp lệ")
        String orderId) {
}
