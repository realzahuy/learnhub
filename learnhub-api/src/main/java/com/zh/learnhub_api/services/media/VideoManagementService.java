package com.zh.learnhub_api.services.media;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.dtos.common.PositionReorderRequestDTO;
import com.zh.learnhub_api.dtos.media.VideoResponseDTO;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.Course;
import com.zh.learnhub_api.pojo.Lesson;
import com.zh.learnhub_api.pojo.Video;
import com.zh.learnhub_api.repositories.course.LessonRepository;
import com.zh.learnhub_api.repositories.media.VideoRepository;
import com.zh.learnhub_api.services.course.CourseEditPolicy;
import com.zh.learnhub_api.utils.PositionReorderer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VideoManagementService {

    private final VideoRepository videoRepository;
    private final LessonRepository lessonRepository;
    private final MediaCleanupService mediaCleanupService;
    private final CourseEditPolicy courseEditPolicy;
    private final PositionReorderer positionReorderer;
    private final VideoLifecycle videoLifecycle;
    private final AppProperties.VideoManagement videoManagementProperties;

    @Transactional(readOnly = true)
    public VideoResponseDTO getVideo(Long videoId, Long instructorId) {
        Video video = videoRepository.findByIdWithLessonAndCourse(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy video"));
        courseEditPolicy.requireOwner(video.getLesson().getCourseId(), instructorId);
        return toResponse(video);
    }

    @Transactional(readOnly = true)
    public List<VideoResponseDTO> getVideoStatuses(
            Long courseId, List<Long> videoIds, Long instructorId) {
        if (videoIds == null || videoIds.isEmpty()) {
            return List.of();
        }

        List<Long> distinctIds = videoIds.stream().distinct().toList();
        int statusBatchLimit = videoManagementProperties.statusBatchLimit();
        if (distinctIds.size() > statusBatchLimit) {
            throw new IllegalArgumentException("Vượt quá giới hạn video");
        }

        List<Video> videos = videoRepository.findByCourseIdAndIds(courseId, distinctIds);
        if (videos.size() != distinctIds.size()) {
            throw new ResourceNotFoundException("Một hoặc nhiều video không thuộc khóa học này");
        }

        courseEditPolicy.requireOwner(videos.get(0).getLesson().getCourseId(), instructorId);
        return videos.stream().map(this::toResponse).toList();
    }

    @Transactional
    public List<VideoResponseDTO> reorderVideos(
            Long lessonId, List<PositionReorderRequestDTO> requests, Long instructorId) {
        Lesson lesson = lessonRepository.findByIdWithCourse(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bài giảng"));
        Course course = lesson.getCourseId();
        courseEditPolicy.requireOwnerAndEditable(course, instructorId);

        long distinctPositions = requests.stream()
                .map(PositionReorderRequestDTO::getPosition)
                .distinct()
                .count();
        if (distinctPositions != requests.size()) {
            throw new IllegalArgumentException("Các video không được trùng vị trí");
        }

        List<Video> videos = videoRepository.findByLesson_IdOrderByPositionAsc(lessonId);
        Map<Long, Video> byId = videos.stream()
                .collect(Collectors.toMap(Video::getId, video -> video));
        for (PositionReorderRequestDTO request : requests) {
            if (!byId.containsKey(request.getId())) {
                throw new ResourceNotFoundException("Không tìm thấy video trong bài giảng");
            }
        }

        List<Video> saved = positionReorderer.reorder(
                videos,
                Video::getPosition,
                Video::setPosition,
                videoRepository::saveAllAndFlush,
                () -> assignRequestedPositions(videos, byId, requests));

        return saved.stream()
                .sorted(Comparator.comparingInt(Video::getPosition))
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public VideoResponseDTO updateTitle(Long videoId, String title, Long instructorId) {
        Video video = videoRepository.findByIdWithLessonAndCourse(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy video"));
        courseEditPolicy.requireOwnerAndEditable(video.getLesson().getCourseId(), instructorId);
        video.setTitle(title.trim());
        return toResponse(video);
    }

    @Transactional
    public void deleteVideo(Long videoId, Long instructorId) {
        Video video = videoRepository.findByIdWithLessonAndCourse(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy video"));

        Course course = video.getLesson().getCourseId();
        courseEditPolicy.requireOwnerAndEditable(course, instructorId);
        videoLifecycle.requireDeletable(video);

        mediaCleanupService.scheduleVideoCleanup(video.getStorageKey());
        videoRepository.delete(video);
    }

    private VideoResponseDTO toResponse(Video video) {
        return VideoResponseDTO.builder()
                .id(video.getId())
                .title(video.getTitle())
                .status(video.getStatus())
                .position(video.getPosition())
                .durationSeconds(video.getDurationSeconds())
                .playbackUrl(VideoPlaybackUrls.instructor(video))
                .build();
    }

    private void assignRequestedPositions(
            List<Video> videos,
            Map<Long, Video> byId,
            List<PositionReorderRequestDTO> requests) {
        Set<Long> mentioned = new HashSet<>();
        int maxRequested = 0;
        for (PositionReorderRequestDTO request : requests) {
            byId.get(request.getId()).setPosition(request.getPosition());
            mentioned.add(request.getId());
            maxRequested = Math.max(maxRequested, request.getPosition());
        }

        int tail = maxRequested;
        for (Video video : videos) {
            if (!mentioned.contains(video.getId())) {
                video.setPosition(++tail);
            }
        }
    }
}
