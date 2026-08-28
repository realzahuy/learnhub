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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VideoPlaybackService {

    private final VideoRepository videoRepository;
    private final LearningAccessService learningAccessService;

    public String authorizeVideoPlayback(Long videoId, Long userId, boolean admin) {
        if (admin) {
            VideoPlaybackProjection video = videoRepository
                    .findPlaybackById(videoId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy video"));
            return requireReadyStorageKey(video);
        }

        VideoPlaybackProjection video = requireReadyPublishedVideo(videoId);
        if (!video.isLessonPreview()) {
            learningAccessService.requireEnrollment(userId, video.getCourseId());
        }
        return video.getStorageKey();
    }

    public String authorizePreviewPlayback(Long videoId) {
        VideoPlaybackProjection video = requireReadyPublishedVideo(videoId);
        if (!video.isLessonPreview()) {
            throw new ForbiddenException("Bài giảng này không khả dụng để xem thử");
        }
        return video.getStorageKey();
    }

    public String authorizeInstructorPlayback(Long videoId, Long instructorId) {
        VideoPlaybackProjection video = videoRepository
                .findPlaybackForInstructorById(videoId, instructorId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy video"));
        return requireReadyStorageKey(video);
    }

    public PlayableVideoDTO toPlayableVideo(Video video) {
        return new PlayableVideoDTO(
                video.getId(),
                video.getTitle(),
                video.getDurationSeconds(),
                VideoPlaybackUrls.authenticated(video),
                video.getStatus());
    }

    private String requireReadyStorageKey(VideoPlaybackProjection video) {
        if (video.getStorageKey() == null || video.getStatus() != VideoStatus.READY) {
            throw new ResourceNotFoundException("Video chưa sẵn sàng để phát");
        }
        return video.getStorageKey();
    }

    private VideoPlaybackProjection requireReadyPublishedVideo(Long videoId) {
        VideoPlaybackProjection video = videoRepository
                .findPlaybackById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy video"));
        if (video.getCourseStatus() != CourseStatus.PUBLISHED) {
            throw new ResourceNotFoundException("Video chưa sẵn sàng để phát");
        }
        requireReadyStorageKey(video);
        return video;
    }
}
