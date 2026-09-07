package com.zh.learnhub_api.services.media;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.dtos.common.PositionReorderRequestDTO;
import com.zh.learnhub_api.dtos.media.VideoResponseDTO;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.mappers.VideoMapper;
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
        courseEditPolicy.requireOwner(video.getLessonId().getCourseId(), instructorId);
        return VideoMapper.toDTO(video);
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

        courseEditPolicy.requireOwner(videos.get(0).getLessonId().getCourseId(), instructorId);
        return videos.stream().map(VideoMapper::toDTO).toList();
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

        List<Video> videos = videoRepository.findByLessonId_IdOrderByPositionAsc(lessonId);
        if (requests.size() != videos.size()) {
            throw new IllegalArgumentException("Phải gửi đủ danh sách video");
        }
        Map<Long, Video> byId = videos.stream()
                .collect(Collectors.toMap(Video::getId, video -> video));
        Set<Long> requestedIds = requests.stream()
                .map(PositionReorderRequestDTO::getId)
                .collect(Collectors.toSet());
        if (requestedIds.size() != requests.size()) {
            throw new IllegalArgumentException("Các video không được trùng ID");
        }
        if (!requestedIds.equals(byId.keySet())) {
            throw new ResourceNotFoundException("Không tìm thấy video trong bài giảng");
        }

        List<Video> saved = positionReorderer.reorder(
                videos,
                Video::getPosition,
                Video::setPosition,
                videoRepository::saveAllAndFlush,
                () -> requests.forEach(request -> byId.get(request.getId()).setPosition(request.getPosition())));

        return saved.stream()
                .sorted(Comparator.comparingInt(Video::getPosition))
                .map(VideoMapper::toDTO)
                .toList();
    }

    @Transactional
    public VideoResponseDTO updateTitle(Long videoId, String title, Long instructorId) {
        Video video = videoRepository.findByIdWithLessonAndCourse(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy video"));
        courseEditPolicy.requireOwnerAndEditable(video.getLessonId().getCourseId(), instructorId);
        video.setTitle(title.trim());
        return VideoMapper.toDTO(video);
    }

    @Transactional
    public void deleteVideo(Long videoId, Long instructorId) {
        Video video = videoRepository.findByIdWithLessonAndCourse(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy video"));

        Course course = video.getLessonId().getCourseId();
        courseEditPolicy.requireOwnerAndEditable(course, instructorId);
        videoLifecycle.requireDeletable(video);

        mediaCleanupService.scheduleVideoCleanup(video.getStorageKey());
        videoRepository.delete(video);
    }

}
