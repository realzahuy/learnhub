package com.zh.learnhub_api.projections.course;

public interface RatedCourseListProjection extends CourseListProjection {
    Double getAverageRating();
    Long getReviewCount();
}
