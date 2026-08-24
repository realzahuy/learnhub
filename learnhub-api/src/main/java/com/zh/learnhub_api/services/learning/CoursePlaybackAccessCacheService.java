package com.zh.learnhub_api.services.learning;

import com.zh.learnhub_api.configs.CacheNames;
import com.zh.learnhub_api.exceptions.ForbiddenException;
import com.zh.learnhub_api.repositories.learning.EnrollmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CoursePlaybackAccessCacheService {

    private final EnrollmentRepository enrollmentRepository;

    @Cacheable(cacheNames = CacheNames.COURSE_PLAYBACK_ACCESS, sync = true)
    public boolean requireEnrollment(Long userId, Long courseId) {
        if (!enrollmentRepository.existsByUserId_IdAndCourseId_Id(userId, courseId)) {
            throw new ForbiddenException("Bạn chưa ghi danh khóa học này");
        }
        return true;
    }
}
