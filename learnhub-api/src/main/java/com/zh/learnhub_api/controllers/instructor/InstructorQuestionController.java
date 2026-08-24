package com.zh.learnhub_api.controllers.instructor;

import com.zh.learnhub_api.dtos.course.QuestionReorderRequestDTO;
import com.zh.learnhub_api.dtos.course.QuestionRequestDTO;
import com.zh.learnhub_api.dtos.course.QuestionResponseDTO;
import com.zh.learnhub_api.dtos.common.MessageResponseDTO;
import com.zh.learnhub_api.services.course.QuestionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.zh.learnhub_api.security.AuthenticatedUserPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/instructor/courses/{courseId}/lessons/{lessonId}/questions")
@RequiredArgsConstructor
public class InstructorQuestionController {

    private final QuestionService questionService;

    @PostMapping
    public ResponseEntity<QuestionResponseDTO> createQuestion(
            @PathVariable Long courseId,
            @PathVariable Long lessonId,
            @Valid @RequestBody QuestionRequestDTO request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        QuestionResponseDTO created =
                questionService.createQuestion(courseId, lessonId, request, userDetails.getUserId());
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @PutMapping("/{questionId}")
    public ResponseEntity<QuestionResponseDTO> updateQuestion(
            @PathVariable Long courseId,
            @PathVariable Long lessonId,
            @PathVariable Long questionId,
            @Valid @RequestBody QuestionRequestDTO request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        QuestionResponseDTO updated = questionService.updateQuestion(
                courseId, lessonId, questionId, request, userDetails.getUserId());
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/reorder")
    public ResponseEntity<List<QuestionResponseDTO>> reorderQuestions(
            @PathVariable Long courseId,
            @PathVariable Long lessonId,
            @NotEmpty(message = "Danh sách sắp xếp không được rỗng") @RequestBody List<@Valid QuestionReorderRequestDTO> requests,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        List<QuestionResponseDTO> reordered =
                questionService.reorderQuestions(courseId, lessonId, requests, userDetails.getUserId());
        return ResponseEntity.ok(reordered);
    }

    @DeleteMapping("/{questionId}")
    public ResponseEntity<MessageResponseDTO> deleteQuestion(
            @PathVariable Long courseId,
            @PathVariable Long lessonId,
            @PathVariable Long questionId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        questionService.deleteQuestion(courseId, lessonId, questionId, userDetails.getUserId());
        return ResponseEntity.ok(new MessageResponseDTO("Xóa câu hỏi thành công"));
    }
}
