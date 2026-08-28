package com.zh.learnhub_api.controllers.instructor;

import com.zh.learnhub_api.dtos.common.PageResponseDTO;
import com.zh.learnhub_api.dtos.course.CourseCreateResponseDTO;
import com.zh.learnhub_api.dtos.course.CourseRejectResponseDTO;
import com.zh.learnhub_api.dtos.course.CourseResponseDTO;
import com.zh.learnhub_api.dtos.course.CourseUpsertRequestDTO;
import com.zh.learnhub_api.dtos.instructor.InstructorCourseContentDTO;
import com.zh.learnhub_api.dtos.media.VideoResponseDTO;
import com.zh.learnhub_api.enums.CourseStatus;
import com.zh.learnhub_api.security.AuthenticatedUserPrincipal;
import com.zh.learnhub_api.services.instructor.InstructorCourseContentService;
import com.zh.learnhub_api.services.instructor.InstructorCourseService;
import com.zh.learnhub_api.services.media.VideoManagementService;
import com.zh.learnhub_api.services.media.VideoProgressSseService;
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
    public PageResponseDTO<CourseResponseDTO> listInstructorCourses(
            @RequestParam(required = false) CourseStatus status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            Pageable pageable,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        return instructorCourseService.getInstructorCourses(
                userDetails.getUserId(), status, category, search, pageable);
    }

    @GetMapping("/{id}/reject-reason")
    public CourseRejectResponseDTO getRejectReason(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        return instructorCourseService.getCourseRejectReason(id, userDetails.getUserId());
    }

    @GetMapping("/{id}")
    public CourseResponseDTO getCourseDetail(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        return instructorCourseService.getInstructorCourseDetail(id, userDetails.getUserId());
    }

    @GetMapping("/{id}/content")
    public InstructorCourseContentDTO getCourseContent(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {
        return courseContentService.getCourseContent(id, userDetails.getUserId());
    }

    @GetMapping("/{id}/videos/status")
    public List<VideoResponseDTO> getVideoStatuses(
            @PathVariable Long id,
            @RequestParam List<Long> ids,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {
        return videoManagementService.getVideoStatuses(id, ids, userDetails.getUserId());
    }

    @GetMapping(value = "/{id}/videos/progress-stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamVideoProgress(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {
        return videoProgressSseService.subscribe(id, userDetails.getUserId());
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CourseCreateResponseDTO> createCourse(
            @Valid @ModelAttribute CourseUpsertRequestDTO request,
            @RequestPart(value = "thumbnailFile", required = false) MultipartFile thumbnailFile,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        CourseCreateResponseDTO created = instructorCourseService.createCourse(
            request,
            userDetails.getUserId(),
            thumbnailFile
        );
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CourseResponseDTO updateCourse(
            @PathVariable Long id,
            @Valid @ModelAttribute CourseUpsertRequestDTO request,
            @RequestPart(value = "thumbnailFile", required = false) MultipartFile thumbnailFile,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        return instructorCourseService.updateCourse(
                id,
                request,
                userDetails.getUserId(),
                thumbnailFile);
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<Void> submitCourse(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        instructorCourseService.submitCourse(id, userDetails.getUserId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCourse(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal userDetails) {

        instructorCourseService.deleteCourse(id, userDetails.getUserId());
        return ResponseEntity.noContent().build();
    }
}
