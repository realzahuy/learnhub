package com.zh.learnhub_api.dtos.learning;

import com.zh.learnhub_api.dtos.media.PlayableVideoDTO;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LearnCourseDTO {

    private Long id;
    private String title;
    private String slug;
    private String instructorName;
    private List<LearnLessonDTO> lessons;
    private Integer completedLessons;
    private Integer totalLessons;
    private Integer quizPassPercent;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LearnLessonDTO {
        private Long id;
        private String title;
        private Integer position;
        private Boolean isPreview;
        private Boolean completed;
        private List<PlayableVideoDTO> videos;
        private Integer questionCount;
        private Integer quizBestScorePercent;
    }
}
