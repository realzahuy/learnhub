package com.zh.learnhub_api.dtos.learning;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuizResponseDTO {
    private Long lessonId;
    private String lessonTitle;
    private Integer passPercent;
    private List<QuizQuestionDTO> questions;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuizQuestionDTO {
        private Long id;
        private String question;
        private Integer position;
        private Boolean multipleCorrect;
        private List<QuizOptionDTO> options;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuizOptionDTO {
        private Long id;
        private String answer;
    }
}
