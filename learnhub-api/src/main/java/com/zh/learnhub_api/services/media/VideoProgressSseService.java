package com.zh.learnhub_api.services.media;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.dtos.media.VideoProgressEventDTO;
import com.zh.learnhub_api.exceptions.ForbiddenException;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@RequiredArgsConstructor
public class VideoProgressSseService {

    private final CourseRepository courseRepository;
    private final AppProperties.Sse sseProperties;
    private final Map<Long, CopyOnWriteArrayList<SseEmitter>> emittersByCourse =
            new ConcurrentHashMap<>();
    private final Map<Long, Map<Long, VideoProgressEventDTO>> latestByCourse =
            new ConcurrentHashMap<>();

    public SseEmitter subscribe(Long courseId, Long instructorId) {
        Long ownerId = courseRepository.findInstructorIdByCourseId(courseId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy khóa học có ID: " + courseId));
        if (!ownerId.equals(instructorId)) {
            throw new ForbiddenException("Bạn không có quyền theo dõi tiến độ video của khóa học này");
        }

        SseEmitter emitter = new SseEmitter(sseProperties.timeoutMs());
        emittersByCourse.computeIfAbsent(courseId, ignored -> new CopyOnWriteArrayList<>())
                .add(emitter);

        Runnable remove = () -> removeEmitter(courseId, emitter);
        emitter.onCompletion(remove);
        emitter.onTimeout(remove);
        emitter.onError(ignored -> remove.run());

        try {
            emitter.send(SseEmitter.event().name("connected").data(Map.of("courseId", courseId)));
            for (VideoProgressEventDTO event : latestByCourse.getOrDefault(courseId, Map.of()).values()) {
                send(emitter, event);
            }
        } catch (IOException | IllegalStateException ignored) {
            remove.run();
        }

        return emitter;
    }

    public void publish(Long courseId, Long videoId, String status, Integer incomingProgress) {
        int progress = Math.max(0, Math.min(100, incomingProgress == null ? 0 : incomingProgress));
        Map<Long, VideoProgressEventDTO> courseProgress = latestByCourse.computeIfAbsent(
                courseId, ignored -> new ConcurrentHashMap<>());

        VideoProgressEventDTO event = courseProgress.compute(videoId, (ignored, previous) -> {
            int monotonicProgress = previous == null
                    ? progress
                    : Math.max(previous.getProgress(), progress);
            return new VideoProgressEventDTO(videoId, status, monotonicProgress);
        });

        for (SseEmitter emitter : emittersByCourse.getOrDefault(
                courseId, new CopyOnWriteArrayList<>())) {
            try {
                send(emitter, event);
            } catch (IOException | IllegalStateException ignored) {
                removeEmitter(courseId, emitter);
            }
        }

        if ("READY".equals(status) || "FAILED".equals(status)) {
            courseProgress.remove(videoId);
            if (courseProgress.isEmpty()) latestByCourse.remove(courseId, courseProgress);
        }
    }

    @Scheduled(fixedRateString = "${app.sse.heartbeat-ms}")
    void heartbeat() {
        emittersByCourse.forEach((courseId, emitters) -> {
            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event().comment("keep-alive"));
                } catch (IOException | IllegalStateException ignored) {
                    removeEmitter(courseId, emitter);
                }
            }
        });
    }

    private void send(SseEmitter emitter, VideoProgressEventDTO event) throws IOException {
        emitter.send(SseEmitter.event()
                .name("video-progress")
                .id(event.getVideoId() + "-" + event.getProgress())
                .data(event));
    }

    private void removeEmitter(Long courseId, SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> emitters = emittersByCourse.get(courseId);
        if (emitters == null) return;
        emitters.remove(emitter);
        if (emitters.isEmpty()) emittersByCourse.remove(courseId, emitters);
    }

}
