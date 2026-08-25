package com.zh.learnhub_api.projections.course;

import com.zh.learnhub_api.enums.CourseStatus;

public interface CourseStatusCountProjection {
    CourseStatus getStatus();
    Long getCourseCount();
}
