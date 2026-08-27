package com.zh.learnhub_api.services.account;

import com.zh.learnhub_api.configs.CacheConfiguration;
import com.zh.learnhub_api.repositories.account.UserRepository;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import com.zh.learnhub_api.services.cache.ApplicationCacheInvalidator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserProfileUpdateService {

    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final ApplicationCacheInvalidator cacheInvalidator;

    @Transactional
    public void updateProfile(
            Long userId, String fullName, String bio, String avatarUrl, boolean publicIdentityChanged) {
        userRepository.updateProfile(userId, fullName, bio, avatarUrl);

        if (publicIdentityChanged) {
            for (String slug : courseRepository.findPublishedSlugsByInstructorId(userId)) {
                cacheInvalidator.evictAfterCommit(CacheConfiguration.PUBLIC_COURSE_DETAILS, slug);
            }
        }
    }
}
