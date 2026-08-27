package com.zh.learnhub_api.services.learning;

import com.zh.learnhub_api.configs.CacheConfiguration;
import com.zh.learnhub_api.exceptions.ForbiddenException;
import com.zh.learnhub_api.repositories.learning.EnrollmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LearningAccessService {

    private final EnrollmentRepository enrollmentRepository;

    @Cacheable(cacheNames = CacheConfiguration.COURSE_PLAYBACK_ACCESS, sync = true)
    @Transactional(readOnly = true)
    public boolean requireEnrollment(Long userId, Long courseId) {
        if (!enrollmentRepository.existsByUserId_IdAndCourseId_Id(userId, courseId)) {
            throw new ForbiddenException("Bạn chưa ghi danh khóa học này");
        }
        return true;
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
