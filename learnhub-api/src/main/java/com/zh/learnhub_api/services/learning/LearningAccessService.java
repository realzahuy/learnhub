package com.zh.learnhub_api.services.learning;

import com.zh.learnhub_api.exceptions.ForbiddenException;
import com.zh.learnhub_api.repositories.learning.EnrollmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LearningAccessService {

    private final EnrollmentRepository enrollmentRepository;

    @Transactional(readOnly = true)
    public void requireEnrollment(Long userId, Long courseId) {
        if (!enrollmentRepository.existsByUserId_IdAndCourseId_Id(userId, courseId)) {
            throw new ForbiddenException("Bạn chưa ghi danh khóa học này");
        }
    }

    public void requireEnrollment(Long enrolled) {
        requireEnrollment(Long.valueOf(1L).equals(enrolled));
    }

    public void requireEnrollment(boolean enrolled) {
        if (!enrolled) {
            throw new ForbiddenException("Bạn chưa ghi danh khóa học này");
        }
    }
}
