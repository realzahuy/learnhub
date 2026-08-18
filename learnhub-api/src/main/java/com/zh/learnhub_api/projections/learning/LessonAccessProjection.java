package com.zh.learnhub_api.projections.learning;

public interface LessonAccessProjection {
    Long getLessonId();
    String getLessonTitle();
    Long getCourseId();
    Long getEnrolled();
}
