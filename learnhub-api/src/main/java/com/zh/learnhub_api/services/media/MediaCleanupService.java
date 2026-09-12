package com.zh.learnhub_api.services.media;

import com.zh.learnhub_api.enums.VideoStatus;
import com.zh.learnhub_api.repositories.media.VideoRepository;
import com.zh.learnhub_api.services.media.mediaconvert.MediaConvertTranscoder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MediaCleanupService {

    private final VideoRepository videoRepository;
    private final VideoStorageService videoStorageService;
    private final MediaConvertTranscoder mediaConvertService;
    private final ImageStorageService imageStorageService;
    private final ApplicationEventPublisher eventPublisher;

    public void scheduleCourseCleanup(Long courseId, boolean deleteThumbnail) {
        List<String> runningJobs = videoRepository.findJobIdsByCourseIdAndStatus(courseId, VideoStatus.PROCESSING);

        afterCommit(() -> {
            runningJobs.forEach(jobId -> runBestEffort(
                    "cancel job " + jobId, () -> mediaConvertService.cancelJob(jobId)));

            if (deleteThumbnail) {
                runBestEffort("delete thumbnail courseId=" + courseId,
                        () -> imageStorageService.deleteCourseThumbnail(courseId));
            }

            runBestEffort("delete videos courseId=" + courseId,
                    () -> videoStorageService.deleteCourseVideos(courseId));
        });
    }

    public void scheduleLessonCleanup(Long courseId, Long lessonId) {
        List<String> runningJobs = videoRepository.findJobIdsByLessonIdAndStatus(lessonId, VideoStatus.PROCESSING);

        afterCommit(() -> {
            runningJobs.forEach(jobId -> runBestEffort(
                    "cancel job " + jobId, () -> mediaConvertService.cancelJob(jobId)));
            runBestEffort("delete videos courseId=" + courseId + " lessonId=" + lessonId,
                    () -> videoStorageService.deleteLessonVideos(courseId, lessonId));
        });
    }

    public void scheduleVideoCleanup(String rawObjectKey) {
        if (rawObjectKey == null || rawObjectKey.isBlank()) {
            return;
        }

        afterCommit(() -> {
            runBestEffort("delete raw " + rawObjectKey, () -> videoStorageService.deleteVideo(rawObjectKey));
            runBestEffort("delete HLS " + rawObjectKey, () -> videoStorageService.deleteHlsOutputOf(rawObjectKey));
        });
    }

    public void scheduleRawVideoCleanup(String rawObjectKey) {
        afterCommit(() -> runBestEffort(
                "delete raw " + rawObjectKey, () -> videoStorageService.deleteVideo(rawObjectKey)));
    }

    private void afterCommit(Runnable task) {
        eventPublisher.publishEvent(new CleanupRequested(task));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onCleanup(CleanupRequested event) {
        event.task().run();
    }

    public record CleanupRequested(Runnable task) {}

    private void runBestEffort(String operation, Runnable task) {
        try {
            task.run();
        } catch (RuntimeException ex) {
            log.warn("Media cleanup failed: {}", operation, ex);
        }
    }
}
