package com.zh.learnhub_api.dtos.course;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CourseUpsertRequestDTO {

    @NotBlank(message = "Tiêu đề không được để trống")
    @Size(max = 255, message = "Tiêu đề không được quá 255 ký tự")
    private String title;

    @Size(max = 255, message = "Slug không được quá 255 ký tự")
    private String slug;

    @NotBlank(message = "Mô tả ngắn không được để trống")
    @Size(max = 500, message = "Mô tả ngắn không được quá 500 ký tự")
    private String shortDescription;

    @NotBlank(message = "Mô tả không được để trống")
    private String description;

    @Size(max = 500, message = "Đường dẫn ảnh thu nhỏ không được quá 500 ký tự")
    private String thumbnail;

    @NotNull(message = "Giá không được để trống")
    @DecimalMin(value = "0.0", inclusive = true, message = "Giá phải >= 0")
    private BigDecimal price;

    @NotNull(message = "Danh mục không được để trống")
    @Positive(message = "Danh mục không hợp lệ")
    private Short categoryId;
}
