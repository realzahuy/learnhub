package com.zh.learnhub_api.projections.course;

public interface InstructorCourseStatusCountProjection extends CourseStatusCountProjection {
    Long getInstructorId();
}
