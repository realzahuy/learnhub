package com.zh.learnhub_api.dtos.media;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VideoProgressEventDTO {
    private Long videoId;
    private String status;
    private int progress;
}
