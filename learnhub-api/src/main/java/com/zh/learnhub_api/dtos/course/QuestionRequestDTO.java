package com.zh.learnhub_api.dtos.course;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuestionRequestDTO {
    @NotBlank(message = "Nội dung câu hỏi không được để trống")
    @Size(max = 1000, message = "Nội dung câu hỏi không được vượt quá 1000 ký tự")
    private String question;

    @NotNull(message = "Câu hỏi phải có danh sách đáp án")
    @Size(min = 2, max = 10, message = "Mỗi câu hỏi cần từ 2 đến 10 đáp án")
    private List<@Valid AnswerRequestDTO> answers;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AnswerRequestDTO {
        @NotBlank(message = "Nội dung đáp án không được để trống")
        @Size(max = 500, message = "Nội dung đáp án không được vượt quá 500 ký tự")
        private String answer;

        @NotNull(message = "Phải cho biết đáp án này đúng hay sai")
        private Boolean isCorrect;
    }
}
