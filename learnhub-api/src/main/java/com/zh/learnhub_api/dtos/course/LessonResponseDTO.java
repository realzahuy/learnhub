package com.zh.learnhub_api.dtos.course;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LessonResponseDTO {
    private Long id;
    private String title;
    private Integer position;
    private Boolean isPreview;
    private Long courseId;
}
