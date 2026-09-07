package com.zh.learnhub_api.services.course;

import com.zh.learnhub_api.enums.CourseStatus;

public record CourseStatusChanged(
        Long courseId,
        Long instructorId,
        CourseStatus status,
        String title,
        String categoryName,
        Audience audience) {

    public enum Audience {
        ADMINS,
        INSTRUCTOR
    }
}
