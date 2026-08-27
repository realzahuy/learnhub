package com.zh.learnhub_api.dtos.course;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuestionResponseDTO {
    private Long id;
    private String question;
    private Integer position;
    private Long lessonId;
    private List<AnswerResponseDTO> answers;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AnswerResponseDTO {
        private Long id;
        private String answer;
        private Boolean isCorrect;
    }
}
