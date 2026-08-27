package com.zh.learnhub_api.services.realtime;

import com.zh.learnhub_api.dtos.realtime.CourseStatusChangedDTO;
import com.zh.learnhub_api.enums.CourseStatus;
import com.zh.learnhub_api.services.notification.NotificationSseService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class CourseRealtimeEventListener {

    private final NotificationSseService notificationSseService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCourseStatusChanged(StatusChanged event) {
        CourseStatusChangedDTO payload =
                new CourseStatusChangedDTO(event.courseId(), event.status(), event.title(), event.categoryName());
        if (event.audience() == Audience.ADMINS) {
            notificationSseService.publishCourseStatusToAdmins(payload);
            return;
        }
        notificationSseService.publishCourseStatusToUser(event.instructorId(), payload);
    }

    public record StatusChanged(
            Long courseId,
            Long instructorId,
            CourseStatus status,
            String title,
            String categoryName,
            Audience audience) {}

    public enum Audience {
        ADMINS,
        INSTRUCTOR
    }
}
