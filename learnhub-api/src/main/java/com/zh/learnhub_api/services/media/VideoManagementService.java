package com.zh.learnhub_api.services.media;

import com.zh.learnhub_api.dtos.media.VideoReorderRequestDTO;
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
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class VideoManagementService {

    private static final String WHAT = "video";

    private final VideoRepository videoRepository;
    private final LessonRepository lessonRepository;
    private final MediaCleanupService mediaCleanupService;
    private final CourseEditPolicy courseEditPolicy;
    private final PositionReorderer positionReorderer;
    private final VideoLifecycle videoLifecycle;

    @Transactional(readOnly = true)
    public VideoResponseDTO getVideo(Long videoId, Long instructorId) {
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Video not found with id: " + videoId));
        courseEditPolicy.requireOwner(video.getLesson().getCourseId(), instructorId);
        return toResponse(video);
    }

    @Transactional(readOnly = true)
    public List<VideoResponseDTO> getVideoStatuses(
            Long courseId, List<Long> videoIds, Long instructorId) {
        if (videoIds == null || videoIds.isEmpty()) {
            return List.of();
        }

        List<Long> distinctIds = new LinkedHashSet<>(videoIds).stream().toList();
        if (distinctIds.size() > 50) {
            throw new IllegalArgumentException("Chỉ được kiểm tra tối đa 50 video mỗi lần");
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
            Long lessonId, List<VideoReorderRequestDTO> requests, Long instructorId) {
        if (requests == null || requests.isEmpty()) {
            throw new IllegalArgumentException("Danh sách sắp xếp không được rỗng");
        }

        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Lesson not found with id: " + lessonId));
        Course course = lesson.getCourseId();
        courseEditPolicy.requireOwnerAndEditable(course, instructorId, WHAT);

        long distinctPositions = requests.stream()
                .map(VideoReorderRequestDTO::getPosition)
                .distinct()
                .count();
        if (distinctPositions != requests.size()) {
            throw new IllegalArgumentException("Các video không được trùng vị trí");
        }

        List<Video> videos = videoRepository.findByLesson_IdOrderByPositionAsc(lessonId);
        Map<Long, Video> byId = videos.stream()
                .collect(Collectors.toMap(Video::getId, video -> video));
        for (VideoReorderRequestDTO request : requests) {
            if (!byId.containsKey(request.getId())) {
                throw new ResourceNotFoundException(
                        "Không tìm thấy video " + request.getId() + " trong bài học");
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
    public void deleteVideo(Long videoId, Long instructorId) {
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Video not found with id: " + videoId));

        Course course = video.getLesson().getCourseId();
        courseEditPolicy.requireOwnerAndEditable(course, instructorId, WHAT);
        videoLifecycle.requireDeletable(video);

        mediaCleanupService.scheduleVideoCleanup(video.getStorageKey());
        videoRepository.delete(video);
        log.info("Deleted video entity with id: {}", videoId);
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
            List<VideoReorderRequestDTO> requests) {
        Set<Long> mentioned = new HashSet<>();
        int maxRequested = 0;
        for (VideoReorderRequestDTO request : requests) {
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
