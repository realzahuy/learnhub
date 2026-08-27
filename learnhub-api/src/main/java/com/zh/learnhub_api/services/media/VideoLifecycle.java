package com.zh.learnhub_api.services.media;

import com.zh.learnhub_api.enums.VideoStatus;
import com.zh.learnhub_api.pojo.Video;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.Objects;
import java.util.Set;

@Component
public class VideoLifecycle {

    private static final Set<VideoStatus> FAILED_SOURCES = EnumSet.of(VideoStatus.UPLOADING, VideoStatus.PROCESSING);
    private static final Set<VideoStatus> DELETABLE_STATUSES =
            EnumSet.of(VideoStatus.UPLOADING, VideoStatus.FAILED, VideoStatus.READY);

    public void initializeUploading(Video video, LocalDateTime now) {
        Objects.requireNonNull(video, "video không được để trống");
        if (video.getStatus() != null) {
            throw new IllegalStateException("Video đã được khởi tạo");
        }

        video.setStatus(VideoStatus.UPLOADING);
        video.setUpdatedAt(requireTime(now));
    }

    public void requireUploading(Video video) {
        requireStatus(video, VideoStatus.UPLOADING);
    }

    public boolean isProcessing(Video video) {
        return currentStatus(video) == VideoStatus.PROCESSING;
    }

    public boolean isFailed(Video video) {
        return currentStatus(video) == VideoStatus.FAILED;
    }

    public void requireDeletable(Video video) {
        VideoStatus current = currentStatus(video);
        if (!DELETABLE_STATUSES.contains(current)) {
            throw new IllegalStateException("Không thể xóa video");
        }
    }

    public void markProcessing(Video video, LocalDateTime now) {
        transition(video, Set.of(VideoStatus.UPLOADING), VideoStatus.PROCESSING, now);
    }

    public void markReady(Video video, LocalDateTime now) {
        transition(video, Set.of(VideoStatus.PROCESSING), VideoStatus.READY, now);
    }

    public void markFailed(Video video, LocalDateTime now) {
        VideoStatus current = currentStatus(video);
        if (current == VideoStatus.FAILED) {
            return;
        }
        transition(video, FAILED_SOURCES, VideoStatus.FAILED, now);
    }

    private void requireStatus(Video video, VideoStatus expected) {
        VideoStatus current = currentStatus(video);
        if (current != expected) {
            throw new IllegalStateException("Trạng thái video không hợp lệ");
        }
    }

    private void transition(Video video, Set<VideoStatus> allowedSources, VideoStatus target, LocalDateTime now) {
        VideoStatus current = currentStatus(video);
        if (!allowedSources.contains(current)) {
            throw new IllegalStateException("Không thể chuyển trạng thái video");
        }

        video.setStatus(target);
        video.setUpdatedAt(requireTime(now));
    }

    private VideoStatus currentStatus(Video video) {
        Objects.requireNonNull(video, "video không được để trống");
        return video.getStatus();
    }

    private LocalDateTime requireTime(LocalDateTime now) {
        return Objects.requireNonNull(now, "thời điểm chuyển trạng thái không được để trống");
    }
}
