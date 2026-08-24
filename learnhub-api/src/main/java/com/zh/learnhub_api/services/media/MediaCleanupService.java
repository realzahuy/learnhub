package com.zh.learnhub_api.services.media;

import com.zh.learnhub_api.services.media.mediaconvert.MediaConvertTranscoder;

import com.zh.learnhub_api.enums.VideoStatus;
import com.zh.learnhub_api.repositories.media.VideoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.io.IOException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MediaCleanupService {

    private final VideoRepository videoRepository;
    private final VideoStorageService videoStorageService;
    private final MediaConvertTranscoder mediaConvertService;
    private final ImageStorageService imageStorageService;

    public void scheduleCourseCleanup(Long courseId, boolean deleteThumbnail) {
        List<String> runningJobs = videoRepository.findJobIdsByCourseIdAndStatus(
            courseId, VideoStatus.PROCESSING);

        afterCommit(() -> {
            cancelJobs(runningJobs);

            if (deleteThumbnail) {
                imageStorageService.deleteCourseThumbnail(courseId);
            }

            videoStorageService.deleteCourseVideos(courseId);
        });
    }

    public void scheduleLessonCleanup(Long courseId, Long lessonId) {
        List<String> runningJobs = videoRepository.findJobIdsByLessonIdAndStatus(
            lessonId, VideoStatus.PROCESSING);

        afterCommit(() -> {
            cancelJobs(runningJobs);

            videoStorageService.deleteLessonVideos(courseId, lessonId);
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
            }

            videoStorageService.deleteHlsOutputOf(rawObjectKey);
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
