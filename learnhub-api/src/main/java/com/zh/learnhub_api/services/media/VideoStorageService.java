package com.zh.learnhub_api.services.media;

import java.util.Map;

public interface VideoStorageService {

    record PresignedUpload(String url, Map<String, String> fields) {
        public PresignedUpload {
            fields = Map.copyOf(fields);
        }
    }

    PresignedUpload generatePresignedUpload(String objectKey, String contentType, long maxSizeBytes);

    void deleteVideo(String objectKey);

    String generateRawObjectKey(Long courseId, Long lessonId, Long videoId, String fileName);

    String generateHlsOutputPath(String rawObjectKey);

    String generateMasterPlaylistKey(String rawObjectKey);

    String getS3Uri(String objectKey);

    String getHlsS3Uri(String hlsPath);

    void deleteCourseVideos(Long courseId);

    void deleteLessonVideos(Long courseId, Long lessonId);

    void deleteHlsOutputOf(String rawObjectKey);
}
