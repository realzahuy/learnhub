package com.zh.learnhub_api.dtos.account;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VerifyEmailRequestDTO {
    @NotBlank(message = "Vui lòng nhập mã xác thực")
    @Pattern(regexp = "\\d{4,10}", message = "Mã xác thực chỉ gồm các chữ số")
    private String code;
}
