package com.zh.learnhub_api.projections.learning;

public interface VideoPlaybackProjection {
    Long getVideoId();
    String getStorageKey();
    String getStatus();
    boolean isLessonPreview();
    Long getCourseId();
    String getCourseStatus();
    Long getInstructorId();
}
