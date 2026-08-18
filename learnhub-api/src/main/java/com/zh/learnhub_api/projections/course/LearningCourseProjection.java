package com.zh.learnhub_api.projections.course;

public interface LearningCourseProjection {
    Long getCourseId();
    String getTitle();
    String getSlug();
    String getInstructorName();
    Long getEnrolled();
}
