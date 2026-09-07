package com.zh.learnhub_api.services.media;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.dtos.media.VideoProgressEventDTO;
import com.zh.learnhub_api.enums.VideoStatus;
import com.zh.learnhub_api.exceptions.ForbiddenException;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.repositories.course.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
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
    private final ApplicationEventPublisher eventPublisher;
    private final Map<Long, CopyOnWriteArrayList<SseEmitter>> emittersByCourse = new ConcurrentHashMap<>();
    private final Map<Long, Map<Long, VideoProgressEventDTO>> latestByCourse = new ConcurrentHashMap<>();

    public SseEmitter subscribe(Long courseId, Long instructorId) {
        Long ownerId = courseRepository
                .findInstructorIdByCourseId(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khóa học"));
        if (!ownerId.equals(instructorId)) {
            throw new ForbiddenException("Không có quyền theo dõi video");
        }

        SseEmitter emitter = new SseEmitter(sseProperties.timeoutMs());
        emittersByCourse
                .computeIfAbsent(courseId, ignored -> new CopyOnWriteArrayList<>())
                .add(emitter);

        Runnable remove = () -> removeEmitter(courseId, emitter);
        emitter.onCompletion(remove);
        emitter.onTimeout(remove);
        emitter.onError(ignored -> remove.run());

        send(courseId, emitter, SseEmitter.event().name("connected").data(Map.of("courseId", courseId)));
        for (VideoProgressEventDTO event :
                latestByCourse.getOrDefault(courseId, Map.of()).values()) {
            sendProgress(courseId, emitter, event);
        }

        return emitter;
    }

    public void publish(Long courseId, Long videoId, VideoStatus status, Integer incomingProgress) {
        int progress = Math.max(0, Math.min(100, incomingProgress == null ? 0 : incomingProgress));
        Map<Long, VideoProgressEventDTO> courseProgress =
                latestByCourse.computeIfAbsent(courseId, ignored -> new ConcurrentHashMap<>());

        VideoProgressEventDTO event = courseProgress.compute(videoId, (ignored, previous) -> {
            int monotonicProgress = previous == null ? progress : Math.max(previous.getProgress(), progress);
            return new VideoProgressEventDTO(videoId, status, monotonicProgress);
        });

        for (SseEmitter emitter : emittersByCourse.getOrDefault(courseId, new CopyOnWriteArrayList<>())) {
            sendProgress(courseId, emitter, event);
        }

        if (status == VideoStatus.READY || status == VideoStatus.FAILED) {
            courseProgress.remove(videoId);
            if (courseProgress.isEmpty()) latestByCourse.remove(courseId, courseProgress);
        }
    }

    public void publishAfterCommit(Long courseId, Long videoId, VideoStatus status, Integer progress) {
        eventPublisher.publishEvent(new ProgressChanged(courseId, videoId, status, progress));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onProgressChanged(ProgressChanged event) {
        publish(event.courseId(), event.videoId(), event.status(), event.progress());
    }

    public record ProgressChanged(Long courseId, Long videoId, VideoStatus status, Integer progress) {}

    @Scheduled(fixedRateString = "${app.sse.heartbeat-ms}")
    void heartbeat() {
        emittersByCourse.forEach((courseId, emitters) -> {
            for (SseEmitter emitter : emitters) {
                send(courseId, emitter, SseEmitter.event().comment("keep-alive"));
            }
        });
    }

    private void sendProgress(Long courseId, SseEmitter emitter, VideoProgressEventDTO event) {
        send(courseId, emitter, SseEmitter.event()
                .name("video-progress")
                .id(event.getVideoId() + "-" + event.getProgress())
                .data(event));
    }

    private void send(Long courseId, SseEmitter emitter, SseEmitter.SseEventBuilder event) {
        try {
            emitter.send(event);
        } catch (IOException ex) {
            removeEmitter(courseId, emitter);
            emitter.completeWithError(ex);
        }
    }

    private void removeEmitter(Long courseId, SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> emitters = emittersByCourse.get(courseId);
        if (emitters == null) return;
        emitters.remove(emitter);
        if (emitters.isEmpty()) emittersByCourse.remove(courseId, emitters);
    }
}
