package com.zh.learnhub_api.dtos.learning;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnrollmentResponseDTO {

    private Long enrollmentId;
    private Long courseId;
    private String courseTitle;
    private String courseSlug;

    private String courseThumbnail;
    private String instructorName;
    private String categoryName;

    private Integer totalLessons;
    private LocalDateTime enrolledAt;
}
