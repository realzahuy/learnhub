package com.zh.learnhub_api.projections.learning;

import java.time.LocalDateTime;

public interface EnrollmentListProjection {
    Long getEnrollmentId();

    Long getCourseId();

    String getCourseTitle();

    String getCourseSlug();

    String getCourseThumbnail();

    String getInstructorName();

    String getCategoryName();

    LocalDateTime getEnrolledAt();
}
