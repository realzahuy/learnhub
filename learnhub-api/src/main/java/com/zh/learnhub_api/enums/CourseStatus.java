package com.zh.learnhub_api.enums;

public enum CourseStatus {

    DRAFT,

    PENDING,

    REJECTED,

    PUBLISHED;

    public static CourseStatus fromString(String status) {
        if (status == null || status.trim().isEmpty()) {
            throw new IllegalArgumentException("Status không được để trống");
        }

        try {
            return CourseStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
                "Trạng thái không hợp lệ: " + status +
                ". Các trạng thái hợp lệ: DRAFT, PENDING, REJECTED, PUBLISHED"
            );
        }
    }
}
