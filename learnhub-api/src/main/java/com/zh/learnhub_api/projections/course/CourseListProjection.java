package com.zh.learnhub_api.projections.course;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface CourseListProjection {
    Long getCourseId();
    String getTitle();
    String getSlug();
    String getShortDescription();
    String getThumbnail();
    BigDecimal getPrice();
    String getStatus();
    LocalDateTime getCreatedAt();
    LocalDateTime getUpdatedAt();
    Long getInstructorId();
    String getInstructorName();
    Short getCategoryId();
    String getCategoryName();
}
