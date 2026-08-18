package com.zh.learnhub_api.projections.learning;

public interface VideoPlaybackProjection {
    Long getVideoId();
    String getStorageKey();
    String getStatus();
    boolean isLessonPreview();
    String getCourseStatus();
    Long getEnrolled();
}
