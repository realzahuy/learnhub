package com.zh.learnhub_api.controllers.instructor;

import com.zh.learnhub_api.dtos.course.LessonReorderDTO;
import com.zh.learnhub_api.dtos.course.LessonRequestDTO;
import com.zh.learnhub_api.dtos.course.LessonResponseDTO;
import com.zh.learnhub_api.dtos.common.MessageResponseDTO;
import com.zh.learnhub_api.services.course.LessonService;
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
@RequestMapping("/api/instructor/courses/{courseId}/lessons")
@RequiredArgsConstructor
public class InstructorLessonController {

    private final LessonService lessonService;

    @PostMapping
    public ResponseEntity<List<LessonResponseDTO>> createLessons(
            @PathVariable Long courseId,
            @NotEmpty(message = "Danh sách bài học không được rỗng") @RequestBody List<@Valid LessonRequestDTO> requests,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        List<LessonResponseDTO> created = lessonService.createLessons(courseId, requests, userDetails.getUserId());
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @PutMapping("/{lessonId}")
    public ResponseEntity<LessonResponseDTO> updateLesson(
            @PathVariable Long courseId,
            @PathVariable Long lessonId,
            @Valid @RequestBody LessonRequestDTO request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        LessonResponseDTO updated = lessonService.updateLesson(courseId, lessonId, request, userDetails.getUserId());
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/reorder")
    public ResponseEntity<List<LessonResponseDTO>> reorderLessons(
            @PathVariable Long courseId,
            @NotEmpty(message = "Danh sách sắp xếp không được rỗng") @RequestBody List<@Valid LessonReorderDTO> requests,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        List<LessonResponseDTO> reordered = lessonService.reorderLessons(courseId, requests, userDetails.getUserId());
        return ResponseEntity.ok(reordered);
    }

    @DeleteMapping("/{lessonId}")
    public ResponseEntity<MessageResponseDTO> deleteLesson(
            @PathVariable Long courseId,
            @PathVariable Long lessonId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        lessonService.deleteLesson(courseId, lessonId, userDetails.getUserId());
        return ResponseEntity.ok(new MessageResponseDTO("Xóa bài học thành công"));
    }
}
