package com.zh.learnhub_api.controllers.instructor;

import com.zh.learnhub_api.dtos.common.MessageResponseDTO;
import com.zh.learnhub_api.dtos.common.PositionReorderRequestDTO;
import com.zh.learnhub_api.dtos.course.QuestionRequestDTO;
import com.zh.learnhub_api.dtos.course.QuestionResponseDTO;
import com.zh.learnhub_api.security.AuthenticatedUserPrincipal;
import com.zh.learnhub_api.services.course.QuestionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/instructor")
@RequiredArgsConstructor
public class InstructorQuestionController {

    private final QuestionService questionService;

    @PostMapping("/lessons/{lessonId}/questions")
    public ResponseEntity<QuestionResponseDTO> createQuestion(
            @PathVariable Long lessonId,
            @Valid @RequestBody QuestionRequestDTO request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        QuestionResponseDTO created =
                questionService.createQuestion(lessonId, request, userDetails.getUserId());
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @PutMapping("/questions/{questionId}")
    public ResponseEntity<QuestionResponseDTO> updateQuestion(
            @PathVariable Long questionId,
            @Valid @RequestBody QuestionRequestDTO request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        QuestionResponseDTO updated = questionService.updateQuestion(questionId, request, userDetails.getUserId());
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/lessons/{lessonId}/questions/reorder")
    public ResponseEntity<List<QuestionResponseDTO>> reorderQuestions(
            @PathVariable Long lessonId,
            @NotEmpty(message = "Danh sách sắp xếp không được rỗng") @RequestBody List<@Valid PositionReorderRequestDTO> requests,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        List<QuestionResponseDTO> reordered =
                questionService.reorderQuestions(lessonId, requests, userDetails.getUserId());
        return ResponseEntity.ok(reordered);
    }

    @DeleteMapping("/questions/{questionId}")
    public ResponseEntity<MessageResponseDTO> deleteQuestion(
            @PathVariable Long questionId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        questionService.deleteQuestion(questionId, userDetails.getUserId());
        return ResponseEntity.ok(new MessageResponseDTO("Xóa câu hỏi thành công"));
    }
}
