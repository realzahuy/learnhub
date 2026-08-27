package com.zh.learnhub_api.projections.learning;

import com.zh.learnhub_api.enums.CourseStatus;
import com.zh.learnhub_api.enums.VideoStatus;

public interface VideoPlaybackProjection {
    Long getCourseId();

    String getStorageKey();

    VideoStatus getStatus();

    boolean isLessonPreview();

    CourseStatus getCourseStatus();
}
