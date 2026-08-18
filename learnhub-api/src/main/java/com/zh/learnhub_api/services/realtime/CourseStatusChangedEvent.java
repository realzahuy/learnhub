package com.zh.learnhub_api.services.realtime;

import com.zh.learnhub_api.enums.CourseStatus;

public record CourseStatusChangedEvent(
        Long courseId,
        Long instructorId,
        CourseStatus status,
        String title,
        String categoryName,
        CourseRealtimeAudience audience) {
}
