package com.zh.learnhub_api.controllers.instructor;

import com.zh.learnhub_api.dtos.common.PositionReorderRequestDTO;
import com.zh.learnhub_api.dtos.media.VideoResponseDTO;
import com.zh.learnhub_api.dtos.media.VideoTitleRequestDTO;
import com.zh.learnhub_api.dtos.media.VideoUploadRequestDTO;
import com.zh.learnhub_api.dtos.media.VideoUploadResponseDTO;
import com.zh.learnhub_api.security.AuthenticatedUserPrincipal;
import com.zh.learnhub_api.services.media.VideoManagementService;
import com.zh.learnhub_api.services.media.VideoUploadService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/instructor")
@RequiredArgsConstructor
public class InstructorVideoController {

    private final VideoUploadService videoUploadService;
    private final VideoManagementService videoManagementService;

    @PostMapping("/lessons/{lessonId}/videos/upload-url")
    public ResponseEntity<VideoUploadResponseDTO> requestUploadUrl(
            @PathVariable Long lessonId,
            @Valid @RequestBody VideoUploadRequestDTO request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        VideoUploadResponseDTO response = videoUploadService.createUploadSession(
                lessonId, request, userDetails.getUserId());
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/videos/{videoId}")
    public VideoResponseDTO getVideo(
            @PathVariable Long videoId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        return videoManagementService.getVideo(videoId, userDetails.getUserId());
    }

    @PutMapping("/lessons/{lessonId}/videos/reorder")
    public java.util.List<VideoResponseDTO> reorderVideos(
            @PathVariable Long lessonId,
            @NotEmpty(message = "Danh sách sắp xếp không được rỗng") @RequestBody java.util.List<@Valid PositionReorderRequestDTO> requests,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        return videoManagementService.reorderVideos(
                lessonId, requests, userDetails.getUserId());
    }

    @PutMapping("/videos/{videoId}")
    public VideoResponseDTO updateVideoTitle(
            @PathVariable Long videoId,
            @Valid @RequestBody VideoTitleRequestDTO request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        return videoManagementService.updateTitle(videoId, request.title(), userDetails.getUserId());
    }

    @DeleteMapping("/videos/{videoId}")
    public ResponseEntity<Void> deleteVideo(
            @PathVariable Long videoId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        videoManagementService.deleteVideo(videoId, userDetails.getUserId());
        return ResponseEntity.noContent().build();
    }

}
