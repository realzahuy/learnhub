package com.zh.learnhub_api.services.learning;

import com.zh.learnhub_api.configs.CacheNames;
import com.zh.learnhub_api.enums.CourseStatus;
import com.zh.learnhub_api.enums.VideoStatus;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.projections.learning.VideoPlaybackProjection;
import com.zh.learnhub_api.repositories.media.VideoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PublishedVideoPlaybackCacheService {

    private final VideoRepository videoRepository;

    @Cacheable(
            cacheNames = CacheNames.PUBLISHED_VIDEO_PLAYBACK,
            key = "#videoId",
            sync = true)
    public PublishedVideoPlayback getReadyPublishedVideo(Long videoId) {
        VideoPlaybackProjection video = videoRepository.findPlaybackById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy video"));

        if (video.getCourseStatus() != CourseStatus.PUBLISHED
                || video.getStorageKey() == null
                || video.getStatus() != VideoStatus.READY) {
            throw new ResourceNotFoundException("Video chưa sẵn sàng để phát");
        }
        return new PublishedVideoPlayback(
                video.getCourseId(),
                video.getStorageKey(),
                video.isLessonPreview());
    }

    public record PublishedVideoPlayback(
            Long courseId,
            String storageKey,
            boolean lessonPreview) {
    }
}
