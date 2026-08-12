package com.zh.learnhub_api.projections.course;

import java.math.BigDecimal;

public interface PublicCourseDetailProjection {
    Long getCourseId();
    String getTitle();
    String getSlug();
    String getShortDescription();
    String getDescription();
    String getThumbnail();
    BigDecimal getPrice();
    Long getInstructorId();
    String getInstructorName();
    String getInstructorAvatar();
    String getCategoryName();
}
