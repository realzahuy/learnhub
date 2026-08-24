package com.zh.learnhub_api.enums;

public enum CourseStatus {

    DRAFT,

    PENDING,

    REJECTED,

    PUBLISHED;

    public static CourseStatus fromString(String status) {
        if (status == null || status.trim().isEmpty()) {
            throw new IllegalArgumentException("Trạng thái không được để trống");
        }

        return CourseStatus.valueOf(status.toUpperCase());
    }
}
