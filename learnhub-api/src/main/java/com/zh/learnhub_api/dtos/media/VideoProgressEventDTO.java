package com.zh.learnhub_api.dtos.media;

import com.zh.learnhub_api.enums.VideoStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VideoProgressEventDTO {
    private Long videoId;
    private VideoStatus status;
    private int progress;
}
