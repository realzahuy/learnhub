package com.zh.learnhub_api.services.media;

import com.zh.learnhub_api.configs.CacheConfiguration;
import com.zh.learnhub_api.enums.CourseStatus;
import com.zh.learnhub_api.enums.VideoStatus;
import com.zh.learnhub_api.pojo.Course;
import com.zh.learnhub_api.pojo.Video;
import com.zh.learnhub_api.repositories.media.VideoRepository;
import com.zh.learnhub_api.services.cache.ApplicationCacheInvalidator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class VideoTranscodeCallbackService {

    private final VideoRepository videoRepository;
    private final VideoStorageService videoStorageService;
    private final MediaCleanupService mediaCleanupService;
    private final VideoLifecycle videoLifecycle;
    private final VideoProgressSseService videoProgressSseService;
    private final ApplicationCacheInvalidator cacheInvalidator;

    @Transactional
    public void handleJobStateChange(String jobId, String status, Integer durationSeconds, Integer progress) {
        Video video = videoRepository.findByMediaconvertJobId(jobId).orElse(null);
        if (video == null) {
            return;
        }

        if (!videoLifecycle.isProcessing(video)) {
            return;
        }

        Long courseId = video.getLesson().getCourseId().getId();
        if ("STATUS_UPDATE".equals(status)) {
            if (progress != null) {
                videoProgressSseService.publish(courseId, video.getId(), VideoStatus.PROCESSING, progress);
            }
            return;
        }

        if ("COMPLETE".equals(status)) {
            handleComplete(video, courseId, durationSeconds);
            return;
        }

        if ("ERROR".equals(status) || "CANCELED".equals(status)) {
            videoLifecycle.markFailed(video, LocalDateTime.now());
            evictPublishedCourseDetail(video);
            videoProgressSseService.publishAfterCommit(courseId, video.getId(), VideoStatus.FAILED, progress);
            return;
        }
    }

    private void handleComplete(Video video, Long courseId, Integer durationSeconds) {
        String rawObjectKey = video.getStorageKey();
        String masterPlaylistKey = videoStorageService.generateMasterPlaylistKey(rawObjectKey);

        videoLifecycle.markReady(video, LocalDateTime.now());
        video.setStorageKey(masterPlaylistKey);
        video.setDurationSeconds(durationSeconds);
        evictPublishedCourseDetail(video);

        videoProgressSseService.publishAfterCommit(courseId, video.getId(), VideoStatus.READY, 100);

        mediaCleanupService.scheduleRawVideoCleanup(rawObjectKey);
    }

    private void evictPublishedCourseDetail(Video video) {
        Course course = video.getLesson().getCourseId();
        if (course.getStatus() == CourseStatus.PUBLISHED) {
            cacheInvalidator.evictAfterCommit(CacheConfiguration.PUBLIC_COURSE_DETAILS, course.getSlug());
        }
    }
}
