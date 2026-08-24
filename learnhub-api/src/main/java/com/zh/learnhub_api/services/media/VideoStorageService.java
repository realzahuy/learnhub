package com.zh.learnhub_api.services.media;

import java.io.IOException;
import java.util.Map;

public interface VideoStorageService {

    record PresignedUpload(String url, Map<String, String> fields) {
        public PresignedUpload {
            fields = Map.copyOf(fields);
        }
    }

    record StoredObject(java.io.InputStream content, long contentLength, String contentType) {}

    StoredObject openHlsObject(String objectKey);

    PresignedUpload generatePresignedUpload(
            String objectKey, String contentType, long maxSizeBytes);

    void deleteVideo(String objectKey) throws IOException;

    String generateRawObjectKey(Long courseId, Long lessonId, Long videoId, String fileName);

    String generateHlsOutputPath(String rawObjectKey);

    String generateMasterPlaylistKey(String rawObjectKey);

    String getS3Uri(String objectKey);

    String getHlsS3Uri(String hlsPath);

    int deleteCourseVideos(Long courseId);

    int deleteLessonVideos(Long courseId, Long lessonId);

    int deleteHlsOutputOf(String rawObjectKey);
}
