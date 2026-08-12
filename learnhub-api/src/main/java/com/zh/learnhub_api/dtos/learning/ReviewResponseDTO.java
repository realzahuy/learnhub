package com.zh.learnhub_api.dtos.learning;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponseDTO {
    private Long id;
    private Integer rating;
    private String comment;
    private Long userId;
    private String userFullName;
    private String userAvatar;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private boolean mine;
}
