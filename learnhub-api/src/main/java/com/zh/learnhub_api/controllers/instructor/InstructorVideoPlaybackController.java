package com.zh.learnhub_api.controllers.instructor;

import com.zh.learnhub_api.dtos.media.VideoPlaybackSessionDTO;
import com.zh.learnhub_api.security.AuthenticatedUserPrincipal;
import com.zh.learnhub_api.services.learning.VideoPlaybackService;
import com.zh.learnhub_api.services.media.CloudFrontPlaybackService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/instructor/videos")
@RequiredArgsConstructor
public class InstructorVideoPlaybackController {

    private final VideoPlaybackService videoPlaybackService;
    private final CloudFrontPlaybackService cloudFrontPlaybackService;

    @PostMapping("/{videoId}/playback-session")
    public ResponseEntity<VideoPlaybackSessionDTO> createPlaybackSession(
            @PathVariable Long videoId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) throws Exception {
        String masterKey = videoPlaybackService.authorizeInstructorPlayback(videoId, principal.getUserId());
        CloudFrontPlaybackService.PlaybackSession session = cloudFrontPlaybackService.createSession(masterKey);
        HttpHeaders headers = new HttpHeaders();
        session.setCookieHeaders().forEach(cookie -> headers.add(HttpHeaders.SET_COOKIE, cookie));

        return ResponseEntity.ok()
                .headers(headers)
                .body(new VideoPlaybackSessionDTO(session.playbackUrl(), session.expiresInSeconds()));
    }
}
