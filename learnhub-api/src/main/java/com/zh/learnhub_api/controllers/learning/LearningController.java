package com.zh.learnhub_api.controllers.learning;

import com.zh.learnhub_api.dtos.learning.LearnCourseDTO;
import com.zh.learnhub_api.dtos.learning.LessonProgressRequestDTO;
import com.zh.learnhub_api.dtos.learning.LessonProgressResponseDTO;
import com.zh.learnhub_api.dtos.course.CourseListItemDTO;
import com.zh.learnhub_api.dtos.learning.QuizResponseDTO;
import com.zh.learnhub_api.dtos.learning.QuizResultDTO;
import com.zh.learnhub_api.dtos.learning.QuizSubmitRequestDTO;
import com.zh.learnhub_api.services.learning.LearningCourseService;
import com.zh.learnhub_api.services.learning.LessonProgressService;
import com.zh.learnhub_api.services.learning.QuizService;
import com.zh.learnhub_api.services.learning.VideoPlaybackService;
import com.zh.learnhub_api.services.media.VideoStorageService;
import com.zh.learnhub_api.security.AuthenticatedUserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/learn")
@RequiredArgsConstructor
public class LearningController {

    private static final String ROLE_ADMIN = "ROLE_ADMIN";

    private final LearningCourseService learningCourseService;
    private final VideoPlaybackService videoPlaybackService;
    private final LessonProgressService lessonProgressService;
    private final QuizService quizService;

    @GetMapping("/courses/by-slug/{slug}")
    public ResponseEntity<LearnCourseDTO> getCourseBySlug(
            @PathVariable String slug,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        return ResponseEntity.ok(
                learningCourseService.getCourseForLearningBySlug(slug, principal.getUserId()));
    }

    @GetMapping("/courses/{courseId}/recommendations")
    public ResponseEntity<List<CourseListItemDTO>> getCourseRecommendations(
            @PathVariable Long courseId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        return ResponseEntity.ok(
                learningCourseService.getRecommendations(courseId, principal.getUserId()));
    }

    @GetMapping("/videos/{videoId}/hls/{fileName}")
    public ResponseEntity<InputStreamResource> streamHlsFile(
            @PathVariable Long videoId,
            @PathVariable String fileName,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        VideoStorageService.StoredObject object =
                videoPlaybackService.openVideoFile(
                        videoId, fileName, principal.getUserId(), isAdmin(principal));

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(object.contentType()))
                .contentLength(object.contentLength())

                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=3600")
                .body(new InputStreamResource(object.content()));
    }

    @GetMapping("/preview/videos/{videoId}/hls/{fileName}")
    public ResponseEntity<InputStreamResource> streamPreviewHlsFile(
            @PathVariable Long videoId,
            @PathVariable String fileName) {

        VideoStorageService.StoredObject object =
                videoPlaybackService.openPreviewVideoFile(videoId, fileName);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(object.contentType()))
                .contentLength(object.contentLength())
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=3600")
                .body(new InputStreamResource(object.content()));
    }

    @GetMapping("/lessons/{lessonId}/quiz")
    public ResponseEntity<QuizResponseDTO> getQuiz(
            @PathVariable Long lessonId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        return ResponseEntity.ok(quizService.getQuiz(lessonId, principal.getUserId()));
    }

    @PostMapping("/lessons/{lessonId}/quiz/submit")
    public ResponseEntity<QuizResultDTO> submitQuiz(
            @PathVariable Long lessonId,
            @Valid @RequestBody QuizSubmitRequestDTO request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        return ResponseEntity.ok(
                quizService.submit(lessonId, request, principal.getUserId()));
    }

    @PutMapping("/lessons/{lessonId}/progress")
    public ResponseEntity<LessonProgressResponseDTO> setProgress(
            @PathVariable Long lessonId,
            @Valid @RequestBody LessonProgressRequestDTO request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        LessonProgressResponseDTO saved = lessonProgressService.setLessonCompleted(
                lessonId, request.completed(), principal.getUserId());

        return ResponseEntity.ok(saved);
    }

    @PutMapping("/lessons/{lessonId}/video-completed")
    public ResponseEntity<LessonProgressResponseDTO> markVideoCompleted(
            @PathVariable Long lessonId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        return ResponseEntity.ok(
                lessonProgressService.markVideoCompleted(lessonId, principal.getUserId()));
    }

    private boolean isAdmin(AuthenticatedUserPrincipal principal) {
        return principal.getAuthorities().stream()
                .anyMatch(authority -> ROLE_ADMIN.equals(authority.getAuthority()));
    }
}
