package com.zh.learnhub_api.services.course;

import com.zh.learnhub_api.enums.CourseStatus;
import com.zh.learnhub_api.exceptions.ForbiddenException;
import com.zh.learnhub_api.pojo.Course;
import org.springframework.stereotype.Component;

@Component
public class CourseEditPolicy {

    public void requireOwner(Course course, Long instructorId) {
        if (!course.getInstructorId().getId().equals(instructorId)) {
            throw new ForbiddenException("Bạn không có quyền thực hiện thao tác này");
        }
    }

    public void requireEditable(Course course, String what) {
        CourseStatus status = course.getStatus();

        if (status == CourseStatus.PENDING) {
            throw new IllegalArgumentException(
                "Không thể thay đổi " + what + " khi khóa học đang chờ duyệt");
        }
        if (status == CourseStatus.PUBLISHED) {
            throw new IllegalArgumentException(
                "Không thể thay đổi " + what + " của khóa học đã xuất bản");
        }
    }

    public void requireOwnerAndEditable(Course course, Long instructorId, String what) {
        requireOwner(course, instructorId);
        requireEditable(course, what);
    }
}
