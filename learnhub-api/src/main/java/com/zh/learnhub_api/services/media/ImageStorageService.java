package com.zh.learnhub_api.services.media;

import org.springframework.web.multipart.MultipartFile;

public interface ImageStorageService {

    String uploadAvatar(MultipartFile file, Long userId);

    String uploadCourseThumbnail(MultipartFile file, Long courseId);

    void deleteCourseThumbnail(Long courseId);
}
