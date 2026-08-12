package com.zh.learnhub_api.services.media;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.dtos.media.VideoConfirmUploadResponseDTO;
import com.zh.learnhub_api.dtos.media.VideoUploadRequestDTO;
import com.zh.learnhub_api.dtos.media.VideoUploadResponseDTO;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.Course;
import com.zh.learnhub_api.pojo.Lesson;
import com.zh.learnhub_api.pojo.Video;
import com.zh.learnhub_api.repositories.course.LessonRepository;
import com.zh.learnhub_api.repositories.media.VideoRepository;
import com.zh.learnhub_api.services.course.CourseEditPolicy;
import com.zh.learnhub_api.services.media.mediaconvert.MediaConvertTranscoder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class VideoUploadService {

    private static final String WHAT = "video";

    private final VideoRepository videoRepository;
    private final LessonRepository lessonRepository;
    private final VideoStorageService videoStorageService;
    private final MediaConvertTranscoder mediaConvertService;
    private final CourseEditPolicy courseEditPolicy;
    private final VideoLifecycle videoLifecycle;
    private final VideoStatusWriter videoStatusWriter;
    private final AppProperties.AwsS3 s3Properties;
    private final AppProperties.Video videoProperties;

    @Transactional
    public VideoUploadResponseDTO createUploadSession(
            Long lessonId, VideoUploadRequestDTO request, Long instructorId) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Lesson not found with id: " + lessonId));
        Course course = lesson.getCourseId();

        courseEditPolicy.requireOwnerAndEditable(course, instructorId, WHAT);
        requireWithinSizeLimit(request.getFileSize());

        Video video = videoRepository.findByLessonAndPosition(lesson, request.getPosition())
                .orElse(null);
        if (video != null) {
            videoLifecycle.requireUploading(video);
            log.info("Retry upload for existing video ID: {}, updating with new upload session",
                    video.getId());
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

        String objectKey = videoStorageService.generateRawObjectKey(
                course.getId(), lessonId, request.getFileName());
        video.setStorageKey(objectKey);

        video = videoRepository.save(video);
        log.info("Video entity saved with id: {}, objectKey: {}, status: UPLOADING",
                video.getId(), objectKey);

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
    public VideoConfirmUploadResponseDTO confirmUpload(Long videoId, Long instructorId) {
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Video not found with id: " + videoId));

        Course course = video.getLesson().getCourseId();

        courseEditPolicy.requireOwner(course, instructorId);
        videoLifecycle.requireUploading(video);

        String objectKey = video.getStorageKey();
        if (objectKey == null || objectKey.isEmpty()) {
            throw new IllegalStateException("Video object key not found in database");
        }

        Long uploadedSize = videoStorageService.findObjectSize(objectKey);
        if (uploadedSize == null) {
            videoStatusWriter.markFailed(video.getId());
            log.error("Object not found in S3: {}", objectKey);
            throw new ResourceNotFoundException("Uploaded file not found in S3");
        }

        if (uploadedSize > videoProperties.maxSize()) {
            videoStatusWriter.markFailed(video.getId());
            try {
                videoStorageService.deleteVideo(objectKey);
            } catch (Exception e) {
                log.error("Không xóa được file quá cỡ {}", objectKey, e);
            }
            log.warn("Video {} bị từ chối: đã tải lên {} byte, trần {} byte",
                    videoId, uploadedSize, videoProperties.maxSize());
            throw new IllegalArgumentException(sizeLimitMessage());
        }

        videoLifecycle.markProcessing(video, LocalDateTime.now());
        try {
            String outputPath = videoStorageService.generateHlsOutputPath(objectKey);
            String jobId = mediaConvertService.createHlsTranscodingJob(objectKey, outputPath);
            video.setMediaconvertJobId(jobId);
            videoRepository.save(video);
            log.info("Video {} status updated to PROCESSING, MediaConvert job: {}",
                    videoId, jobId);
        } catch (Exception e) {
            videoStatusWriter.markFailed(video.getId());
            log.error("Failed to create MediaConvert job for video: {}", videoId, e);
            throw new RuntimeException("Failed to start video processing", e);
        }

        return VideoConfirmUploadResponseDTO.builder()
                .videoId(video.getId())
                .status(video.getStatus())
                .build();
    }

    private void requireWithinSizeLimit(long fileSize) {
        if (fileSize > videoProperties.maxSize()) {
            throw new IllegalArgumentException(sizeLimitMessage());
        }
    }

    private String sizeLimitMessage() {
        long megabytes = videoProperties.maxSize() / (1024L * 1024L);
        String limit = (megabytes >= 1024 && megabytes % 1024 == 0)
                ? (megabytes / 1024) + " GB"
                : megabytes + " MB";
        return "Video vượt quá dung lượng cho phép (tối đa " + limit + ")";
    }
}
