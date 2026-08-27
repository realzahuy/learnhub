package com.zh.learnhub_api.dtos.course;

import com.zh.learnhub_api.enums.CourseStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CourseResponseDTO {
    private Long id;
    private String title;
    private String slug;
    private String shortDescription;
    private String description;
    private String thumbnail;
    private BigDecimal price;
    private CourseStatus status;
    private Long instructorId;
    private String instructorName;
    private Long categoryId;
    private String categoryName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
