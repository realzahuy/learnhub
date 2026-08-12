package com.zh.learnhub_api.dtos.media;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VideoResponseDTO {
    private Long id;
    private String title;
    private String status;
    private Integer position;
    private Integer durationSeconds;
    private String playbackUrl;
}
