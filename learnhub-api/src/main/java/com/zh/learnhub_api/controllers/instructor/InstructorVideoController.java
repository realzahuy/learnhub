package com.zh.learnhub_api.controllers.instructor;

import com.zh.learnhub_api.dtos.common.MessageResponseDTO;
import com.zh.learnhub_api.dtos.media.VideoReorderRequestDTO;
import com.zh.learnhub_api.dtos.media.VideoResponseDTO;
import com.zh.learnhub_api.dtos.media.VideoConfirmUploadResponseDTO;
import com.zh.learnhub_api.dtos.media.VideoUploadRequestDTO;
import com.zh.learnhub_api.dtos.media.VideoUploadResponseDTO;
import com.zh.learnhub_api.services.media.VideoManagementService;
import com.zh.learnhub_api.services.media.VideoUploadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.zh.learnhub_api.security.AuthenticatedUserPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/instructor/lessons/{lessonId}/videos")
@RequiredArgsConstructor
public class InstructorVideoController {

    private final VideoUploadService videoUploadService;
    private final VideoManagementService videoManagementService;

    @PostMapping("/upload-url")
    public ResponseEntity<VideoUploadResponseDTO> requestUploadUrl(
            @PathVariable Long lessonId,
            @Valid @RequestBody VideoUploadRequestDTO request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        VideoUploadResponseDTO response = videoUploadService.createUploadSession(
                lessonId, request, userDetails.getUserId());
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/{videoId}/confirm")
    public ResponseEntity<VideoConfirmUploadResponseDTO> confirmUpload(
            @PathVariable Long lessonId,
            @PathVariable Long videoId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        VideoConfirmUploadResponseDTO response = videoUploadService.confirmUpload(
                videoId, userDetails.getUserId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{videoId}")
    public ResponseEntity<VideoResponseDTO> getVideo(
            @PathVariable Long lessonId,
            @PathVariable Long videoId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        VideoResponseDTO response = videoManagementService.getVideo(
                videoId, userDetails.getUserId());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/reorder")
    public ResponseEntity<java.util.List<VideoResponseDTO>> reorderVideos(
            @PathVariable Long lessonId,
            @Valid @RequestBody java.util.List<@Valid VideoReorderRequestDTO> requests,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        var reordered = videoManagementService.reorderVideos(
                lessonId, requests, userDetails.getUserId());
        return ResponseEntity.ok(reordered);
    }

    @DeleteMapping("/{videoId}")
    public ResponseEntity<MessageResponseDTO> deleteVideo(
            @PathVariable Long lessonId,
            @PathVariable Long videoId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        videoManagementService.deleteVideo(videoId, userDetails.getUserId());
        return ResponseEntity.ok(new MessageResponseDTO("Xóa video thành công"));
    }

}
