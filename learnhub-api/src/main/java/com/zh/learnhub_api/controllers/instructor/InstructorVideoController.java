package com.zh.learnhub_api.controllers.instructor;

import com.zh.learnhub_api.dtos.common.MessageResponseDTO;
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
    public ResponseEntity<VideoResponseDTO> getVideo(
            @PathVariable Long videoId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        VideoResponseDTO response = videoManagementService.getVideo(
                videoId, userDetails.getUserId());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/lessons/{lessonId}/videos/reorder")
    public ResponseEntity<java.util.List<VideoResponseDTO>> reorderVideos(
            @PathVariable Long lessonId,
            @NotEmpty(message = "Danh sách sắp xếp không được rỗng") @RequestBody java.util.List<@Valid PositionReorderRequestDTO> requests,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        var reordered = videoManagementService.reorderVideos(
                lessonId, requests, userDetails.getUserId());
        return ResponseEntity.ok(reordered);
    }

    @PutMapping("/videos/{videoId}")
    public ResponseEntity<VideoResponseDTO> updateVideoTitle(
            @PathVariable Long videoId,
            @Valid @RequestBody VideoTitleRequestDTO request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        VideoResponseDTO updated = videoManagementService.updateTitle(videoId, request.title(), userDetails.getUserId());
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/videos/{videoId}")
    public ResponseEntity<MessageResponseDTO> deleteVideo(
            @PathVariable Long videoId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        videoManagementService.deleteVideo(videoId, userDetails.getUserId());
        return ResponseEntity.ok(new MessageResponseDTO("Xóa video thành công"));
    }

}
