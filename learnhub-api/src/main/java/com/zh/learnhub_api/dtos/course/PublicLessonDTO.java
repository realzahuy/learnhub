package com.zh.learnhub_api.dtos.course;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PublicLessonDTO {

    private Long id;
    private String title;
    private Integer position;
    private Boolean isPreview;
    private List<PublicVideoDTO> videos;
    private Integer questionCount;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PublicVideoDTO {
        private Long id;
        private String title;
        private Integer durationSeconds;
        private String previewUrl;
    }
}
