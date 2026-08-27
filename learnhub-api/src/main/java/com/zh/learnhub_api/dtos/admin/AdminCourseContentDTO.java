package com.zh.learnhub_api.dtos.admin;

import com.zh.learnhub_api.dtos.course.QuestionResponseDTO;
import com.zh.learnhub_api.dtos.media.PlayableVideoDTO;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminCourseContentDTO {

    private Long courseId;
    private String courseTitle;
    private List<AdminLessonContentDTO> lessons;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdminLessonContentDTO {
        private Long id;
        private String title;
        private Integer position;
        private Boolean isPreview;
        private List<PlayableVideoDTO> videos;
        private List<QuestionResponseDTO> questions;
    }
}
