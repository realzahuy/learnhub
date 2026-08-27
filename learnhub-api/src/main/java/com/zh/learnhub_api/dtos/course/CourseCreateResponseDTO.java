package com.zh.learnhub_api.dtos.course;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CourseCreateResponseDTO {
    private Long id;
    private String title;
    private BigDecimal price;
    private String thumbnail;
    private String shortDescription;
    private String categoryName;
}
