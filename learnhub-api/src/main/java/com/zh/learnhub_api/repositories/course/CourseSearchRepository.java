package com.zh.learnhub_api.repositories.course;

import com.zh.learnhub_api.projections.course.CourseDetailProjection;
import com.zh.learnhub_api.projections.course.CourseListProjection;
import com.zh.learnhub_api.projections.course.RatedCourseListProjection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CourseSearchRepository {

    Page<CourseDetailProjection> findFilteredCourseDetails(
            Long instructorId,
            String status,
            String categoryName,
            String keyword,
            Pageable pageable);

    Page<CourseListProjection> findPublishedCourses(
            String categoryName,
            String keyword,
            Pageable pageable);

    Page<RatedCourseListProjection> findPublishedCoursesOrderByRating(
            String categoryName,
            String keyword,
            double ratingPrior,
            double ratingPriorCount,
            Pageable pageable);
}
