package com.zh.learnhub_api.dtos.course;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CourseRejectRequestDTO {
    @NotBlank(message = "Lý do từ chối không được để trống")
    @Size(max = 2000, message = "Lý do từ chối không được quá 2000 ký tự")
    private String comment;
}
