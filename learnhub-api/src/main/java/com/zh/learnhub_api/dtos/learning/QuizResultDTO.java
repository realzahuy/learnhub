package com.zh.learnhub_api.dtos.learning;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuizResultDTO {
    private Integer correctCount;
    private Integer totalQuestions;
    private Integer scorePercent;
    private Integer passPercent;
    private Boolean passed;
    private List<QuizQuestionResultDTO> questions;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuizQuestionResultDTO {
        private Long questionId;
        private Boolean correct;
        private List<Long> correctAnswerIds;
        private List<Long> selectedAnswerIds;
    }
}
