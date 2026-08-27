package com.zh.learnhub_api.services.media;

import com.zh.learnhub_api.enums.VideoStatus;
import com.zh.learnhub_api.repositories.media.VideoRepository;
import com.zh.learnhub_api.services.media.mediaconvert.MediaConvertTranscoder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MediaCleanupService {

    private final VideoRepository videoRepository;
    private final VideoStorageService videoStorageService;
    private final MediaConvertTranscoder mediaConvertService;
    private final ImageStorageService imageStorageService;

    public void scheduleCourseCleanup(Long courseId, boolean deleteThumbnail) {
        List<String> runningJobs = videoRepository.findJobIdsByCourseIdAndStatus(courseId, VideoStatus.PROCESSING);

        afterCommit(() -> {
            runningJobs.forEach(jobId -> runBestEffort(() -> mediaConvertService.cancelJob(jobId)));

            if (deleteThumbnail) {
                runBestEffort(() -> imageStorageService.deleteCourseThumbnail(courseId));
            }

            runBestEffort(() -> videoStorageService.deleteCourseVideos(courseId));
        });
    }

    public void scheduleLessonCleanup(Long courseId, Long lessonId) {
        List<String> runningJobs = videoRepository.findJobIdsByLessonIdAndStatus(lessonId, VideoStatus.PROCESSING);

        afterCommit(() -> {
            runningJobs.forEach(jobId -> runBestEffort(() -> mediaConvertService.cancelJob(jobId)));
            runBestEffort(() -> videoStorageService.deleteLessonVideos(courseId, lessonId));
        });
    }

    public void scheduleVideoCleanup(String rawObjectKey) {
        if (rawObjectKey == null || rawObjectKey.isBlank()) {
            return;
        }

        afterCommit(() -> {
            runBestEffort(() -> videoStorageService.deleteVideo(rawObjectKey));
            runBestEffort(() -> videoStorageService.deleteHlsOutputOf(rawObjectKey));
        });
    }

    public void scheduleRawVideoCleanup(String rawObjectKey) {
        afterCommit(() -> runBestEffort(() -> videoStorageService.deleteVideo(rawObjectKey)));
    }

    private void afterCommit(Runnable task) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            task.run();
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                task.run();
            }
        });
    }

    private void runBestEffort(Runnable task) {
        try {
            task.run();
        } catch (RuntimeException ignored) {
        }
    }
}
