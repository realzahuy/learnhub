package com.zh.learnhub_api.services.notification;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.dtos.notification.NotificationResponseDTO;
import com.zh.learnhub_api.dtos.realtime.CourseStatusChangedDTO;
import lombok.RequiredArgsConstructor;
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
public class NotificationSseService {

    private static final String CONNECTED = "connected";
    private static final String NOTIFICATION = "notification";
    private static final String COURSE_STATUS_CHANGED = "course-status-changed";
    private static final String ACCOUNT_LOCKED = "account-locked";
    private static final String ACCOUNT_LOCKED_MESSAGE =
            "Tài khoản đã bị khóa";

    private final AppProperties.Sse sseProperties;
    private final Map<Long, CopyOnWriteArrayList<SseEmitter>> emittersByUser = new ConcurrentHashMap<>();
    private final Map<Long, CopyOnWriteArrayList<SseEmitter>> adminEmittersByUser = new ConcurrentHashMap<>();

    public SseEmitter subscribe(Long userId, boolean receivesAdminCourseEvents) {
        SseEmitter emitter = new SseEmitter(sseProperties.timeoutMs());
        emittersByUser
                .computeIfAbsent(userId, ignored -> new CopyOnWriteArrayList<>())
                .add(emitter);
        if (receivesAdminCourseEvents) {
            adminEmittersByUser
                    .computeIfAbsent(userId, ignored -> new CopyOnWriteArrayList<>())
                    .add(emitter);
        }

        Runnable remove = () -> removeEmitter(userId, emitter);
        emitter.onCompletion(remove);
        emitter.onTimeout(remove);
        emitter.onError(ignored -> remove.run());

        send(userId, emitter, SseEmitter.event().name(CONNECTED).data(Map.of("userId", userId)));
        return emitter;
    }

    public void publish(Long userId, NotificationResponseDTO notification) {
        CopyOnWriteArrayList<SseEmitter> emitters = emittersByUser.get(userId);
        if (emitters == null) return;
        for (SseEmitter emitter : emitters) {
            send(
                    userId,
                    emitter,
                    SseEmitter.event()
                            .name(NOTIFICATION)
                            .id(notification.getId().toString())
                            .data(notification));
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onNotificationCreated(Created event) {
        publish(event.recipientId(), event.notification());
    }

    public void publishCourseStatusToAdmins(CourseStatusChangedDTO event) {
        adminEmittersByUser.forEach((userId, emitters) -> {
            for (SseEmitter emitter : emitters) {
                send(
                        userId,
                        emitter,
                        SseEmitter.event().name(COURSE_STATUS_CHANGED).data(event));
            }
        });
    }

    public void publishCourseStatusToUser(Long userId, CourseStatusChangedDTO event) {
        CopyOnWriteArrayList<SseEmitter> emitters = emittersByUser.get(userId);
        if (emitters == null) return;
        for (SseEmitter emitter : emitters) {
            send(userId, emitter, SseEmitter.event().name(COURSE_STATUS_CHANGED).data(event));
        }
    }

    public void publishAccountLocked(Long userId) {
        CopyOnWriteArrayList<SseEmitter> emitters = emittersByUser.get(userId);
        if (emitters == null) return;
        for (SseEmitter emitter : emitters) {
            send(
                    userId,
                    emitter,
                    SseEmitter.event().name(ACCOUNT_LOCKED).data(Map.of("message", ACCOUNT_LOCKED_MESSAGE)));
        }
    }

    private void send(Long userId, SseEmitter emitter, SseEmitter.SseEventBuilder event) {
        try {
            emitter.send(event);
        } catch (IOException ex) {
            removeEmitter(userId, emitter);
            emitter.completeWithError(ex);
        }
    }

    @Scheduled(fixedRateString = "${app.sse.heartbeat-ms}")
    void heartbeat() {
        emittersByUser.forEach((userId, emitters) -> {
            for (SseEmitter emitter : emitters) {
                send(userId, emitter, SseEmitter.event().comment("keep-alive"));
            }
        });
    }

    private void removeEmitter(Long userId, SseEmitter emitter) {
        removeEmitterFromMap(emittersByUser, userId, emitter);
        removeEmitterFromMap(adminEmittersByUser, userId, emitter);
    }

    private void removeEmitterFromMap(
            Map<Long, CopyOnWriteArrayList<SseEmitter>> emittersMap, Long userId, SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> emitters = emittersMap.get(userId);
        if (emitters == null) return;
        emitters.remove(emitter);
        if (emitters.isEmpty()) {
            emittersMap.remove(userId, emitters);
        }
    }

    public record Created(Long recipientId, NotificationResponseDTO notification) {}
}
