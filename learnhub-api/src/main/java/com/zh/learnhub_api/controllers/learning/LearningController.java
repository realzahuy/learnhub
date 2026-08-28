package com.zh.learnhub_api.controllers.learning;

import com.zh.learnhub_api.dtos.course.RecommendationCardDTO;
import com.zh.learnhub_api.dtos.learning.LearnCourseDTO;
import com.zh.learnhub_api.dtos.learning.QuizResponseDTO;
import com.zh.learnhub_api.dtos.learning.QuizResultDTO;
import com.zh.learnhub_api.dtos.learning.QuizSubmitRequestDTO;
import com.zh.learnhub_api.dtos.media.VideoPlaybackSessionDTO;
import com.zh.learnhub_api.security.AuthenticatedUserPrincipal;
import com.zh.learnhub_api.services.learning.LearningCourseService;
import com.zh.learnhub_api.services.learning.QuizService;
import com.zh.learnhub_api.services.learning.VideoPlaybackService;
import com.zh.learnhub_api.services.media.CloudFrontPlaybackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
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
    private final CloudFrontPlaybackService cloudFrontPlaybackService;
    private final QuizService quizService;

    @GetMapping("/courses/by-slug/{slug}")
    public LearnCourseDTO getCourseBySlug(
            @PathVariable String slug,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        return learningCourseService.getCourseForLearningBySlug(slug, principal.getUserId());
    }

    @GetMapping("/courses/{courseId}/recommendations")
    public List<RecommendationCardDTO> getCourseRecommendations(
            @PathVariable Long courseId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        return learningCourseService.getRecommendations(courseId, principal.getUserId());
    }

    @PostMapping("/videos/{videoId}/playback-session")
    public ResponseEntity<VideoPlaybackSessionDTO> createPlaybackSession(
            @PathVariable Long videoId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) throws Exception {

        String masterKey = videoPlaybackService.authorizeVideoPlayback(
                videoId, principal.getUserId(), isAdmin(principal));

        return playbackSession(masterKey);
    }

    @PostMapping("/preview/videos/{videoId}/playback-session")
    public ResponseEntity<VideoPlaybackSessionDTO> createPreviewPlaybackSession(
            @PathVariable Long videoId) throws Exception {

        String masterKey = videoPlaybackService.authorizePreviewPlayback(videoId);

        return playbackSession(masterKey);
    }

    @GetMapping("/lessons/{lessonId}/quiz")
    public QuizResponseDTO getQuiz(
            @PathVariable Long lessonId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        return quizService.getQuiz(lessonId, principal.getUserId());
    }

    @PostMapping("/lessons/{lessonId}/quiz/submit")
    public QuizResultDTO submitQuiz(
            @PathVariable Long lessonId,
            @Valid @RequestBody QuizSubmitRequestDTO request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {

        return quizService.submit(lessonId, request, principal.getUserId());
    }

    private boolean isAdmin(AuthenticatedUserPrincipal principal) {
        return principal.getAuthorities().stream()
                .anyMatch(authority -> ROLE_ADMIN.equals(authority.getAuthority()));
    }

    private ResponseEntity<VideoPlaybackSessionDTO> playbackSession(String masterKey) throws Exception {
        CloudFrontPlaybackService.PlaybackSession session = cloudFrontPlaybackService.createSession(masterKey);
        HttpHeaders headers = new HttpHeaders();
        session.setCookieHeaders().forEach(cookie -> headers.add(HttpHeaders.SET_COOKIE, cookie));

        return ResponseEntity.ok()
                .headers(headers)
                .body(new VideoPlaybackSessionDTO(session.playbackUrl(), session.expiresInSeconds()));
    }
}
