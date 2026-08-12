package com.zh.learnhub_api.dtos.media;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VideoUploadResponseDTO {
    private Long videoId;
    private String uploadUrl;
    private Map<String, String> uploadFields;
    private String objectKey;
    private Integer expiresIn;
}
