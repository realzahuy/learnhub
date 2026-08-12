package com.zh.learnhub_api.services.vector;

public record CourseVectorUpsertEvent(Long courseId) {

    public CourseVectorUpsertEvent {
        if (courseId == null) {
            throw new IllegalArgumentException("courseId không được null");
        }
    }
}
