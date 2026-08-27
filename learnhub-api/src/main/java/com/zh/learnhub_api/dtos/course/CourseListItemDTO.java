package com.zh.learnhub_api.dtos.course;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CourseListItemDTO {
    private Long id;
    private String title;
    private String slug;
    private String thumbnail;
    private BigDecimal price;
    private String instructorName;
    private String categoryName;
    private double averageRating;
    private long reviewCount;
}
