package com.zh.learnhub_api.services.notification;

import com.zh.learnhub_api.dtos.notification.NotificationResponseDTO;
import com.zh.learnhub_api.dtos.realtime.CourseStatusChangedDTO;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.repositories.account.UserRepository;
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
public class NotificationSseService {

    private static final long EMITTER_TIMEOUT_MS = 30 * 60 * 1000L;

    private final UserRepository userRepository;
    private final Map<Long, CopyOnWriteArrayList<SseEmitter>> emittersByUser =
            new ConcurrentHashMap<>();
    private final Map<Long, CopyOnWriteArrayList<SseEmitter>> adminEmittersByUser =
            new ConcurrentHashMap<>();

    public SseEmitter subscribe(
            Long userId, String username, boolean receivesAdminCourseEvents) {
        Long resolvedUserId = resolveUserId(userId, username);

        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MS);
        emittersByUser.computeIfAbsent(resolvedUserId, ignored -> new CopyOnWriteArrayList<>())
                .add(emitter);
        if (receivesAdminCourseEvents) {
            adminEmittersByUser.computeIfAbsent(resolvedUserId, ignored -> new CopyOnWriteArrayList<>())
                    .add(emitter);
        }

        Runnable remove = () -> removeEmitter(resolvedUserId, emitter);
        emitter.onCompletion(remove);
        emitter.onTimeout(remove);
        emitter.onError(ignored -> remove.run());

        try {
            emitter.send(SseEmitter.event()
                    .name(SseEventNames.CONNECTED)
                    .data(Map.of("userId", resolvedUserId)));
        } catch (IOException ex) {
            remove.run();
            emitter.completeWithError(ex);
        }
        return emitter;
    }

    private Long resolveUserId(Long userId, String username) {
        if (userId != null) {
            return userId;
        }
        return userRepository.findByUsernameWithoutRoles(username)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"))
                .getId();
    }

    public void publish(Long userId, NotificationResponseDTO notification) {
        CopyOnWriteArrayList<SseEmitter> emitters = emittersByUser.get(userId);
        if (emitters == null) return;
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name(SseEventNames.NOTIFICATION)
                        .id(notification.getId().toString())
                        .data(notification));
            } catch (IOException ex) {
                removeEmitter(userId, emitter);
                emitter.completeWithError(ex);
            }
        }
    }

    public void publishCourseStatusToAdmins(CourseStatusChangedDTO event) {
        adminEmittersByUser.forEach((userId, emitters) -> {
            for (SseEmitter emitter : emitters) {
                sendCourseStatus(userId, emitter, event);
            }
        });
    }

    public void publishCourseStatusToUser(Long userId, CourseStatusChangedDTO event) {
        CopyOnWriteArrayList<SseEmitter> emitters = emittersByUser.get(userId);
        if (emitters == null) return;
        for (SseEmitter emitter : emitters) {
            sendCourseStatus(userId, emitter, event);
        }
    }

    private void sendCourseStatus(
            Long userId,
            SseEmitter emitter,
            CourseStatusChangedDTO event) {
        try {
            emitter.send(SseEmitter.event()
                    .name(SseEventNames.COURSE_STATUS_CHANGED)
                    .data(event));
        } catch (IOException ex) {
            removeEmitter(userId, emitter);
            emitter.completeWithError(ex);
        }
    }

    @Scheduled(fixedRate = 15_000L)
    void heartbeat() {
        emittersByUser.forEach((userId, emitters) -> {
            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event().comment("keep-alive"));
                } catch (IOException ex) {
                    removeEmitter(userId, emitter);
                    emitter.completeWithError(ex);
                }
            }
        });
    }

    private void removeEmitter(Long userId, SseEmitter emitter) {
        removeEmitterFromMap(emittersByUser, userId, emitter);
        removeEmitterFromMap(adminEmittersByUser, userId, emitter);
    }

    private void removeEmitterFromMap(
            Map<Long, CopyOnWriteArrayList<SseEmitter>> emittersMap,
            Long userId,
            SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> emitters = emittersMap.get(userId);
        if (emitters == null) return;
        emitters.remove(emitter);
        if (emitters.isEmpty()) {
            emittersMap.remove(userId, emitters);
        }
    }
}
