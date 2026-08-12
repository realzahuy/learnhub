package com.zh.learnhub_api.controllers.instructor;

import com.zh.learnhub_api.dtos.course.CourseCreateResponseDTO;
import com.zh.learnhub_api.dtos.course.CourseRejectResponseDTO;
import com.zh.learnhub_api.dtos.course.CourseUpsertRequestDTO;
import com.zh.learnhub_api.dtos.course.CourseResponseDTO;
import com.zh.learnhub_api.dtos.common.PageResponseDTO;
import com.zh.learnhub_api.dtos.common.MessageResponseDTO;
import com.zh.learnhub_api.dtos.instructor.InstructorCourseContentDTO;
import com.zh.learnhub_api.dtos.media.VideoResponseDTO;
import com.zh.learnhub_api.services.instructor.InstructorCourseContentService;
import com.zh.learnhub_api.services.instructor.InstructorCourseService;
import com.zh.learnhub_api.services.media.VideoProgressSseService;
import com.zh.learnhub_api.services.media.VideoManagementService;
import com.zh.learnhub_api.security.AuthenticatedUserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/instructor/courses")
@RequiredArgsConstructor
public class InstructorCourseController {

    private final InstructorCourseService instructorCourseService;
    private final InstructorCourseContentService courseContentService;
    private final VideoManagementService videoManagementService;
    private final VideoProgressSseService videoProgressSseService;

    @GetMapping
    public ResponseEntity<PageResponseDTO<CourseResponseDTO>> listInstructorCourses(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            Pageable pageable,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        PageResponseDTO<CourseResponseDTO> response =
            instructorCourseService.getInstructorCourses(
                    userDetails.getUserId(), status, category, search, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/reject-reason")
    public ResponseEntity<CourseRejectResponseDTO> getRejectReason(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        CourseRejectResponseDTO reason = instructorCourseService.getCourseRejectReason(id, userDetails.getUserId());
        return ResponseEntity.ok(reason);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CourseResponseDTO> getCourseDetail(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        CourseResponseDTO course = instructorCourseService.getInstructorCourseDetail(id, userDetails.getUserId());
        return ResponseEntity.ok(course);
    }

    @GetMapping("/{id}/content")
    public ResponseEntity<InstructorCourseContentDTO> getCourseContent(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {
        return ResponseEntity.ok(
                courseContentService.getCourseContent(id, userDetails.getUserId()));
    }

    @GetMapping("/{id}/videos/status")
    public ResponseEntity<List<VideoResponseDTO>> getVideoStatuses(
            @PathVariable Long id,
            @RequestParam List<Long> ids,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {
        return ResponseEntity.ok(
                videoManagementService.getVideoStatuses(id, ids, userDetails.getUserId()));
    }

    @GetMapping(value = "/{id}/videos/progress-stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamVideoProgress(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {
        return videoProgressSseService.subscribe(id, userDetails.getUserId());
    }

    @PostMapping
    public ResponseEntity<CourseCreateResponseDTO> createCourse(
            @Valid @RequestBody CourseUpsertRequestDTO request,
            @RequestParam(required = false) String status,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        CourseCreateResponseDTO created = instructorCourseService.createCourse(
            request,
            userDetails.getUserId(),
            status
        );
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CourseResponseDTO> updateCourse(
            @PathVariable Long id,
            @Valid @ModelAttribute CourseUpsertRequestDTO request,
            @RequestPart(value = "thumbnailFile", required = false) MultipartFile thumbnailFile,
            @RequestParam(required = false, defaultValue = "false") boolean submit,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        if (thumbnailFile != null && !thumbnailFile.isEmpty()) {
            request.setThumbnail(instructorCourseService.uploadThumbnail(id, userDetails.getUserId(), thumbnailFile));
        }

        CourseResponseDTO updated = instructorCourseService.updateCourse(id, request, userDetails.getUserId(), submit);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponseDTO> deleteCourse(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        instructorCourseService.deleteCourse(id, userDetails.getUserId());
        return ResponseEntity.ok(new MessageResponseDTO("Xóa khóa học thành công"));
    }
}
