package com.zh.learnhub_api.dtos.course;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CourseRejectResponseDTO {
    private Long id;
    private String comment;
    private LocalDateTime createdAt;
}
