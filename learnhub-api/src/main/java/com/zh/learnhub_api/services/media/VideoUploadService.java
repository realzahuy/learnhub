package com.zh.learnhub_api.services.media;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.dtos.media.VideoUploadRequestDTO;
import com.zh.learnhub_api.dtos.media.VideoUploadResponseDTO;
import com.zh.learnhub_api.enums.VideoStatus;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.Course;
import com.zh.learnhub_api.pojo.Lesson;
import com.zh.learnhub_api.pojo.Video;
import com.zh.learnhub_api.repositories.course.LessonRepository;
import com.zh.learnhub_api.repositories.media.VideoRepository;
import com.zh.learnhub_api.services.course.CourseEditPolicy;
import com.zh.learnhub_api.services.media.mediaconvert.MediaConvertTranscoder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VideoUploadService {

    private final VideoRepository videoRepository;
    private final LessonRepository lessonRepository;
    private final VideoStorageService videoStorageService;
    private final MediaConvertTranscoder mediaConvertService;
    private final CourseEditPolicy courseEditPolicy;
    private final VideoLifecycle videoLifecycle;
    private final VideoProgressSseService videoProgressSseService;
    private final AppProperties.AwsS3 s3Properties;
    private final AppProperties.Video videoProperties;

    @Transactional
    public VideoUploadResponseDTO createUploadSession(Long lessonId, VideoUploadRequestDTO request, Long instructorId) {
        Lesson lesson = lessonRepository
                .findByIdWithCourse(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài giảng"));
        Course course = lesson.getCourseId();

        courseEditPolicy.requireOwnerAndEditable(course, instructorId);
        requireWithinSizeLimit(request.getFileSize());

        Video video = videoRepository
                .findByLessonAndPosition(lesson, request.getPosition())
                .orElse(null);
        if (video != null) {
            videoLifecycle.requireUploading(video);
            video.setTitle(request.getTitle());
            video.setUpdatedAt(LocalDateTime.now());
        } else {
            video = new Video();
            video.setTitle(request.getTitle());
            video.setPosition(request.getPosition());
            video.setLesson(lesson);
            LocalDateTime now = LocalDateTime.now();
            video.setCreatedAt(now);
            videoLifecycle.initializeUploading(video, now);
        }

        video = videoRepository.save(video);

        String objectKey = videoStorageService.generateRawObjectKey(
                course.getId(), lessonId, video.getId(), request.getFileName());
        video.setStorageKey(objectKey);
        video = videoRepository.save(video);

        VideoStorageService.PresignedUpload upload = videoStorageService.generatePresignedUpload(
                objectKey, request.getContentType(), videoProperties.maxSize());

        return VideoUploadResponseDTO.builder()
                .videoId(video.getId())
                .uploadUrl(upload.url())
                .uploadFields(upload.fields())
                .objectKey(objectKey)
                .expiresIn(s3Properties.presignedUrl().expiration())
                .build();
    }

    @Transactional
    public void processUploadedObject(Long videoId, String objectKey) {
        Video video = videoRepository.findByIdForUploadProcessing(videoId).orElse(null);
        if (video == null) {
            return;
        }

        if (!objectKey.equals(video.getStorageKey())) {
            return;
        }

        if (video.getStatus() != VideoStatus.UPLOADING) {
            return;
        }

        videoLifecycle.markProcessing(video, LocalDateTime.now());
        String outputPath = videoStorageService.generateHlsOutputPath(objectKey);
        String jobId = mediaConvertService.createHlsTranscodingJob(
                objectKey, outputPath, mediaConvertClientToken(videoId, objectKey));
        video.setMediaconvertJobId(jobId);
        videoRepository.save(video);

        Long courseId = video.getLesson().getCourseId().getId();
        videoProgressSseService.publishAfterCommit(courseId, videoId, VideoStatus.PROCESSING, 0);
    }

    private String mediaConvertClientToken(Long videoId, String objectKey) {
        UUID objectToken = UUID.nameUUIDFromBytes(objectKey.getBytes(StandardCharsets.UTF_8));
        return "learnhub-video-" + videoId + "-" + objectToken;
    }

    private void requireWithinSizeLimit(long fileSize) {
        if (fileSize > videoProperties.maxSize()) {
            throw new IllegalArgumentException(sizeLimitMessage());
        }
    }

    private String sizeLimitMessage() {
        long megabytes = videoProperties.maxSize() / (1024L * 1024L);
        String limit = (megabytes >= 1024 && megabytes % 1024 == 0)
                ? "%d GB".formatted(megabytes / 1024)
                : "%d MB".formatted(megabytes);
        return "Video vượt quá %s".formatted(limit);
    }
}
