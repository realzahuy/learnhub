package com.zh.learnhub_api.dtos.media;

import com.zh.learnhub_api.enums.VideoStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlayableVideoDTO {
    private Long id;
    private String title;
    private Integer durationSeconds;
    private String playbackUrl;
    private VideoStatus status;
}
