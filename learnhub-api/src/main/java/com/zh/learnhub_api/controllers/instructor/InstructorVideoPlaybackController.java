package com.zh.learnhub_api.controllers.instructor;

import com.zh.learnhub_api.security.AuthenticatedUserPrincipal;
import com.zh.learnhub_api.services.learning.VideoPlaybackService;
import com.zh.learnhub_api.services.media.VideoStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/instructor/videos")
@RequiredArgsConstructor
public class InstructorVideoPlaybackController {

    private final VideoPlaybackService videoPlaybackService;

    @GetMapping("/{videoId}/hls/{fileName}")
    public ResponseEntity<InputStreamResource> streamHlsFile(
            @PathVariable Long videoId,
            @PathVariable String fileName,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        VideoStorageService.StoredObject object = videoPlaybackService
                .openInstructorVideoFile(videoId, fileName, principal.getUserId());

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(object.contentType()))
                .contentLength(object.contentLength())
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=3600")
                .body(new InputStreamResource(object.content()));
    }
}
