package com.zh.learnhub_api.dtos.learning;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuizSubmitRequestDTO {
    @NotNull(message = "Thiếu bài làm")
    private List<@Valid QuizAnswerSubmissionDTO> answers;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuizAnswerSubmissionDTO {
        @NotNull(message = "Thiếu id câu hỏi")
        private Long questionId;

        private List<Long> selectedAnswerIds;
    }
}
