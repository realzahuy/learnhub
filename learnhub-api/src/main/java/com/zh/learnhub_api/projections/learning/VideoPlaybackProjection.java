package com.zh.learnhub_api.projections.learning;

public interface VideoPlaybackProjection {
    Long getVideoId();
    Long getCourseId();
    String getStorageKey();
    String getStatus();
    boolean isLessonPreview();
    String getCourseStatus();
    Long getEnrolled();
}
