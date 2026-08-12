package com.zh.learnhub_api.services.media;

import com.zh.learnhub_api.services.media.mediaconvert.MediaConvertTranscoder;

import com.zh.learnhub_api.enums.VideoStatus;
import com.zh.learnhub_api.repositories.media.VideoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.io.IOException;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MediaCleanupService {

    private final VideoRepository videoRepository;
    private final VideoStorageService videoStorageService;
    private final MediaConvertTranscoder mediaConvertService;
    private final ImageStorageService imageStorageService;

    public void scheduleCourseCleanup(Long courseId, boolean deleteThumbnail) {
        List<String> runningJobs = videoRepository.findJobIdsByCourseIdAndStatus(
            courseId, VideoStatus.PROCESSING.name());

        afterCommit(() -> {
            cancelJobs(runningJobs);

            if (deleteThumbnail) {
                imageStorageService.deleteCourseThumbnail(courseId);
            }

            int deleted = videoStorageService.deleteCourseVideos(courseId);
            log.info("Storage cleanup done for deleted course {}: {} video object(s), {} job(s) cancelled",
                     courseId, deleted, runningJobs.size());
        });
    }

    public void scheduleLessonCleanup(Long courseId, Long lessonId) {
        List<String> runningJobs = videoRepository.findJobIdsByLessonIdAndStatus(
            lessonId, VideoStatus.PROCESSING.name());

        afterCommit(() -> {
            cancelJobs(runningJobs);

            int deleted = videoStorageService.deleteLessonVideos(courseId, lessonId);
            log.info("Storage cleanup done for deleted lesson {} of course {}: {} video object(s), {} job(s) cancelled",
                     lessonId, courseId, deleted, runningJobs.size());
        });
    }

    public void scheduleVideoCleanup(String rawObjectKey) {
        if (rawObjectKey == null || rawObjectKey.isBlank()) {
            return;
        }

        afterCommit(() -> {
            try {
                videoStorageService.deleteVideo(rawObjectKey);
            } catch (IOException e) {

                log.error("Failed to delete raw video object {}", rawObjectKey, e);
            }

            int hlsDeleted = videoStorageService.deleteHlsOutputOf(rawObjectKey);
            log.info("Storage cleanup done for deleted video {}: {} leftover HLS object(s) removed",
                     rawObjectKey, hlsDeleted);
        });
    }

    private void cancelJobs(List<String> jobIds) {
        jobIds.forEach(mediaConvertService::cancelJob);
    }

    private void afterCommit(Runnable task) {
        Runnable safeTask = () -> {
            try {
                task.run();
            } catch (Exception e) {
                log.error("Storage cleanup failed after commit", e);
            }
        };

        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            safeTask.run();
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                safeTask.run();
            }
        });
    }
}
