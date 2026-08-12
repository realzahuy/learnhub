package com.zh.learnhub_api.dtos.course;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

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
