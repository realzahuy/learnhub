package com.zh.learnhub_api.dtos.course;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CourseRejectResponseDTO {
    private Long id;
    private String comment;
    private LocalDateTime createdAt;
}
