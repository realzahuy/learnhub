package com.zh.learnhub_api.services.media;

import com.zh.learnhub_api.pojo.Video;
import com.zh.learnhub_api.repositories.media.VideoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class VideoTranscodeCallbackService {

    private final VideoRepository videoRepository;
    private final VideoStorageService videoStorageService;
    private final VideoLifecycle videoLifecycle;
    private final VideoProgressSseService videoProgressSseService;

    @Transactional
    public void handleJobStateChange(
            String jobId,
            String status,
            Integer durationSeconds,
            Integer progress) {
        Video video = videoRepository.findByMediaconvertJobId(jobId).orElse(null);
        if (video == null) {
            log.warn("Nhận event cho job {} nhưng không tìm thấy video tương ứng", jobId);
            return;
        }

        if (!videoLifecycle.isProcessing(video)) {
            log.info("Video {} đang ở trạng thái {}, bỏ qua event {} (tin trùng)",
                    video.getId(), video.getStatus(), status);
            return;
        }

        Long courseId = video.getLesson().getCourseId().getId();
        if ("STATUS_UPDATE".equals(status)) {
            if (progress != null) {
                videoProgressSseService.publish(
                        courseId, video.getId(), "PROCESSING", progress);
            }
            return;
        }

        if ("COMPLETE".equals(status)) {
            handleComplete(video, courseId, durationSeconds);
            return;
        }

        if ("ERROR".equals(status) || "CANCELED".equals(status)) {
            videoLifecycle.markFailed(video, LocalDateTime.now());
            videoRepository.save(video);
            publishProgressAfterCommit(courseId, video.getId(), "FAILED", progress);
            log.error("Video {} -> FAILED (MediaConvert job {} {})",
                    video.getId(), jobId, status);
            return;
        }

        log.info("Bỏ qua status {} cho video {}", status, video.getId());
    }

    private void handleComplete(Video video, Long courseId, Integer durationSeconds) {
        String rawObjectKey = video.getStorageKey();
        String masterPlaylistKey = videoStorageService.generateMasterPlaylistKey(rawObjectKey);

        videoLifecycle.markReady(video, LocalDateTime.now());
        video.setStorageKey(masterPlaylistKey);
        video.setDurationSeconds(durationSeconds);
        videoRepository.save(video);

        log.info("Video {} -> READY. Duration: {}s, HLS master: {}",
                video.getId(), durationSeconds, masterPlaylistKey);
        publishProgressAfterCommit(courseId, video.getId(), "READY", 100);

        try {
            videoStorageService.deleteVideo(rawObjectKey);
            log.info("Đã xóa file gốc: {}", rawObjectKey);
        } catch (Exception e) {
            log.error("Không xóa được file gốc: {}", rawObjectKey, e);
        }
    }

    private void publishProgressAfterCommit(
            Long courseId,
            Long videoId,
            String status,
            Integer progress) {
        Runnable publish = () -> videoProgressSseService.publish(
                courseId, videoId, status, progress);

        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            publish.run();
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        publish.run();
                    }
                });
    }
}
