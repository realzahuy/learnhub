package com.zh.learnhub_api.services.learning;

import com.zh.learnhub_api.dtos.media.PlayableVideoDTO;
import com.zh.learnhub_api.enums.VideoStatus;
import com.zh.learnhub_api.exceptions.ForbiddenException;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.Video;
import com.zh.learnhub_api.projections.learning.VideoPlaybackProjection;
import com.zh.learnhub_api.repositories.media.VideoRepository;
import com.zh.learnhub_api.services.media.VideoPlaybackUrls;
import com.zh.learnhub_api.services.media.VideoStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VideoPlaybackService {

    private final VideoRepository videoRepository;
    private final VideoStorageService videoStorageService;
    private final PublishedVideoPlaybackCacheService publishedVideoPlaybackCacheService;
    private final CoursePlaybackAccessCacheService coursePlaybackAccessCacheService;

    public VideoStorageService.StoredObject openVideoFile(
            Long videoId, String fileName, Long userId, boolean admin) {
        if (admin) {
            VideoPlaybackProjection video = videoRepository.findPlaybackById(videoId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy video"));
            return openReadyVideoFile(video, fileName);
        }

        var video = publishedVideoPlaybackCacheService.getReadyPublishedVideo(videoId);
        if (!video.lessonPreview()) {
            coursePlaybackAccessCacheService.requireEnrollment(userId, video.courseId());
        }
        return videoStorageService.openHlsObject(
                resolveHlsKey(video.storageKey(), fileName));
    }

    public VideoStorageService.StoredObject openPreviewVideoFile(Long videoId, String fileName) {
        var video = publishedVideoPlaybackCacheService.getReadyPublishedVideo(videoId);
        if (!video.lessonPreview()) {
            throw new ForbiddenException("Bài giảng này không khả dụng để xem thử");
        }
        return videoStorageService.openHlsObject(
                resolveHlsKey(video.storageKey(), fileName));
    }

    public VideoStorageService.StoredObject openInstructorVideoFile(
            Long videoId, String fileName, Long instructorId) {
        VideoPlaybackProjection video = videoRepository
                .findPlaybackForInstructorById(videoId, instructorId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy video"));
        return openReadyVideoFile(video, fileName);
    }

    public PlayableVideoDTO toPlayableVideo(Video video) {
        return new PlayableVideoDTO(
                video.getId(),
                video.getTitle(),
                video.getDurationSeconds(),
                VideoPlaybackUrls.authenticated(video),
                video.getStatus().name());
    }

    private VideoStorageService.StoredObject openReadyVideoFile(
            VideoPlaybackProjection video, String fileName) {
        if (video.getStorageKey() == null || !VideoStatus.READY.name().equals(video.getStatus())) {
            throw new ResourceNotFoundException("Video chưa sẵn sàng để phát");
        }
        return videoStorageService.openHlsObject(resolveHlsKey(video.getStorageKey(), fileName));
    }

    private String resolveHlsKey(String masterKey, String fileName) {
        if (fileName == null || fileName.isBlank()
                || fileName.contains("/") || fileName.contains("\\") || fileName.contains("..")) {
            throw new ForbiddenException("Tên tệp không hợp lệ");
        }
        String folder = masterKey.substring(0, masterKey.lastIndexOf('/') + 1);
        return folder + fileName;
    }

}
