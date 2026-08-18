package com.zh.learnhub_api.services.instructor;

import com.zh.learnhub_api.dtos.common.PageResponseDTO;
import com.zh.learnhub_api.configs.CacheNames;
import com.zh.learnhub_api.services.learning.RatingStats;
import com.zh.learnhub_api.services.learning.ReviewService;

import com.zh.learnhub_api.dtos.course.CourseListItemDTO;
import com.zh.learnhub_api.dtos.instructor.InstructorProfileDTO;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.projections.instructor.PublicInstructorProjection;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import com.zh.learnhub_api.repositories.learning.EnrollmentRepository;
import com.zh.learnhub_api.repositories.account.UserRepository;
import com.zh.learnhub_api.mappers.CourseMapper;
import com.zh.learnhub_api.projections.course.CourseListProjection;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InstructorProfileService {

    private static final String ROLE_INSTRUCTOR = "ROLE_INSTRUCTOR";

    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final ReviewService reviewService;
    private final CourseMapper courseMapper;

    @Cacheable(
            cacheNames = CacheNames.PUBLIC_INSTRUCTOR_PROFILES,
            key = "#instructorId",
            sync = true)
    public InstructorProfileDTO getPublicProfile(Long instructorId) {
        PublicInstructorProjection instructor = userRepository
                .findPublicInstructor(instructorId, ROLE_INSTRUCTOR)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giảng viên"));

        RatingStats ratingStats = reviewService.getInstructorRatingStats(instructorId);

        return new InstructorProfileDTO(
                instructor.getId(),
                instructor.getFullName(),
                instructor.getAvatar(),
                instructor.getBio(),
                instructor.getJoinedAt(),
                ratingStats.average(),
                ratingStats.reviewCount(),
                enrollmentRepository.countDistinctStudents(instructorId),
                courseRepository.countByInstructorId_IdAndStatus(instructorId, "PUBLISHED")
        );
    }

    public PageResponseDTO<CourseListItemDTO> getPublishedCourses(
            Long instructorId, Pageable requestedPage) {

        if (!userRepository.hasRole(instructorId, ROLE_INSTRUCTOR)) {
            throw new ResourceNotFoundException("Không tìm thấy giảng viên");
        }

        Pageable pageable = PageRequest.of(
                requestedPage.getPageNumber(), requestedPage.getPageSize());
        Page<CourseListProjection> projectionPage =
                courseRepository.findPublishedCoursesByInstructor(instructorId, pageable);

        List<CourseListItemDTO> courses = projectionPage.getContent().stream()
                .map(courseMapper::mapListProjectionToDTO)
                .collect(Collectors.toList());

        courseMapper.applyRatings(courses, reviewService.getRatingStatsByCourses(
                courses.stream().map(CourseListItemDTO::getId).collect(Collectors.toList())));

        return PageResponseDTO.from(projectionPage, courses);
    }
}
