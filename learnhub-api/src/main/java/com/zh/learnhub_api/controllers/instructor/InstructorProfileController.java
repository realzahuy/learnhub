package com.zh.learnhub_api.controllers.instructor;

import com.zh.learnhub_api.dtos.common.PageResponseDTO;
import com.zh.learnhub_api.dtos.course.CourseListItemDTO;
import com.zh.learnhub_api.dtos.instructor.InstructorProfileDTO;
import com.zh.learnhub_api.services.instructor.InstructorProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/instructors")
@RequiredArgsConstructor
public class InstructorProfileController {

    private final InstructorProfileService instructorProfileService;

    @GetMapping("/{id}")
    public ResponseEntity<InstructorProfileDTO> getPublicProfile(@PathVariable Long id) {
        return ResponseEntity.ok(instructorProfileService.getPublicProfile(id));
    }

    @GetMapping("/{id}/courses")
    public ResponseEntity<PageResponseDTO<CourseListItemDTO>> getPublishedCourses(
            @PathVariable Long id, Pageable pageable) {
        return ResponseEntity.ok(instructorProfileService.getPublishedCourses(id, pageable));
    }
}
