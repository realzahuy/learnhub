package com.zh.learnhub_api.dtos.instructor;

import com.zh.learnhub_api.dtos.course.QuestionResponseDTO;
import com.zh.learnhub_api.dtos.media.VideoResponseDTO;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InstructorCourseContentDTO {

    private Long courseId;
    private String courseTitle;
    private List<InstructorLessonContentDTO> lessons;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InstructorLessonContentDTO {
        private Long id;
        private String title;
        private Integer position;
        private Boolean isPreview;
        private Long courseId;
        private List<VideoResponseDTO> videos;
        private List<QuestionResponseDTO> questions;
    }
}
