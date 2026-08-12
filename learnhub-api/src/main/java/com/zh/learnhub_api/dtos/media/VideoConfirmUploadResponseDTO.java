package com.zh.learnhub_api.dtos.media;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VideoConfirmUploadResponseDTO {
    private Long videoId;
    private String status;
}
