package com.zh.learnhub_api.services.learning;

import com.zh.learnhub_api.dtos.media.PlayableVideoDTO;
import com.zh.learnhub_api.enums.CourseStatus;
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

    public VideoStorageService.StoredObject openVideoFile(
            Long videoId, String fileName, Long userId, boolean admin) {
        VideoPlaybackProjection video = (admin
                ? videoRepository.findPlaybackById(videoId)
                : videoRepository.findPlaybackForUserById(videoId, userId))
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy video"));
        checkCanWatch(video, admin);
        return openReadyVideoFile(video, fileName);
    }

    public VideoStorageService.StoredObject openPreviewVideoFile(Long videoId, String fileName) {
        VideoPlaybackProjection video = videoRepository.findPlaybackById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy video"));
        if (!isPublishedPreview(video)) {
            throw new ForbiddenException("Bài giảng này không khả dụng để xem thử");
        }
        return openReadyVideoFile(video, fileName);
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
                video.getStatus());
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
            throw new ForbiddenException("Tên file không hợp lệ");
        }
        String folder = masterKey.substring(0, masterKey.lastIndexOf('/') + 1);
        return folder + fileName;
    }

    private void checkCanWatch(VideoPlaybackProjection video, boolean admin) {
        if (admin || isPublishedPreview(video) || Long.valueOf(1L).equals(video.getEnrolled())) {
            return;
        }
        throw new ForbiddenException("Bạn chưa ghi danh khóa học này");
    }

    private boolean isPublishedPreview(VideoPlaybackProjection video) {
        return video.isLessonPreview()
                && CourseStatus.PUBLISHED.name().equals(video.getCourseStatus());
    }
}
