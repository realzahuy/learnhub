package com.zh.learnhub_api.services.media;

import com.zh.learnhub_api.enums.VideoStatus;
import com.zh.learnhub_api.pojo.Video;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Set;

@Component
public class VideoLifecycle {

    private static final Set<VideoStatus> DELETABLE_STATUSES =
            Set.of(VideoStatus.UPLOADING, VideoStatus.FAILED, VideoStatus.READY);

    public void initializeUploading(Video video, LocalDateTime now) {
        video.setStatus(VideoStatus.UPLOADING);
        video.setUpdatedAt(now);
    }

    public void requireUploading(Video video) {
        requireStatus(video, VideoStatus.UPLOADING);
    }

    public boolean isProcessing(Video video) {
        return video.getStatus() == VideoStatus.PROCESSING;
    }

    public void requireDeletable(Video video) {
        VideoStatus current = video.getStatus();
        if (!DELETABLE_STATUSES.contains(current)) {
            throw new IllegalArgumentException("Không thể xóa video");
        }
    }

    public void markProcessing(Video video, LocalDateTime now) {
        requireUploading(video);
        video.setStatus(VideoStatus.PROCESSING);
        video.setUpdatedAt(now);
    }

    public void markReady(Video video, LocalDateTime now) {
        requireStatus(video, VideoStatus.PROCESSING);
        video.setStatus(VideoStatus.READY);
        video.setUpdatedAt(now);
    }

    public void markFailed(Video video, LocalDateTime now) {
        requireStatus(video, VideoStatus.PROCESSING);
        video.setStatus(VideoStatus.FAILED);
        video.setUpdatedAt(now);
    }

    private void requireStatus(Video video, VideoStatus expected) {
        VideoStatus current = video.getStatus();
        if (current != expected) {
            throw new IllegalArgumentException("Trạng thái video không hợp lệ");
        }
    }
}
