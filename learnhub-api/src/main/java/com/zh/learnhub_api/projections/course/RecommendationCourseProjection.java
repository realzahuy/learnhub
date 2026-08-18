package com.zh.learnhub_api.projections.course;

public interface RecommendationCourseProjection {
    Long getCourseId();
    String getTitle();
    String getCategoryName();
    String getShortDescription();
    String getDescription();
    Long getEnrolled();
}
