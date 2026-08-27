package com.zh.learnhub_api.dtos.course;

import com.zh.learnhub_api.dtos.learning.RatingSummaryDTO;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PublicCourseDetailDTO {
    private Long id;
    private String title;
    private String slug;
    private String shortDescription;
    private String description;
    private String thumbnail;
    private BigDecimal price;
    private Long instructorId;
    private String instructorName;
    private String instructorAvatar;
    private String categoryName;
    private List<PublicLessonDTO> lessons;
    private RatingSummaryDTO ratingSummary;
}
