package com.zh.learnhub_api.services.media;

import org.springframework.web.multipart.MultipartFile;

public interface ImageStorageService {

    ImageUploadResult uploadAvatar(MultipartFile file, Long userId);

    ImageUploadResult uploadCourseThumbnail(MultipartFile file, Long courseId);

    void deleteCourseThumbnail(Long courseId);
}
