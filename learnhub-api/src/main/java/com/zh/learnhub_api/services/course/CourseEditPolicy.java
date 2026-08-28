package com.zh.learnhub_api.services.course;

import com.zh.learnhub_api.enums.CourseStatus;
import com.zh.learnhub_api.exceptions.ForbiddenException;
import com.zh.learnhub_api.pojo.Course;
import org.springframework.stereotype.Component;

@Component
public class CourseEditPolicy {

    public void requireOwner(Course course, Long instructorId) {
        if (!course.getInstructorId().getId().equals(instructorId)) {
            throw new ForbiddenException("Không có quyền");
        }
    }

    private void requireEditable(Course course) {
        CourseStatus status = course.getStatus();
        if (status == CourseStatus.PENDING || status == CourseStatus.PUBLISHED) {
            throw new IllegalArgumentException("Không thể thay đổi");
        }
    }

    public void requireOwnerAndEditable(Course course, Long instructorId) {
        requireOwner(course, instructorId);
        requireEditable(course);
    }
}
