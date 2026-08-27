package com.zh.learnhub_api.dtos.learning;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

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
