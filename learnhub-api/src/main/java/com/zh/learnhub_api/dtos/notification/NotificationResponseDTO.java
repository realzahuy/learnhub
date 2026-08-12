package com.zh.learnhub_api.dtos.notification;

import com.zh.learnhub_api.enums.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponseDTO {

    private Long id;
    private NotificationType type;
    private String title;
    private String content;
    private Long courseId;
    private LocalDateTime readAt;
    private LocalDateTime createdAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NotificationPageDTO {
        private List<NotificationResponseDTO> content;
        private boolean last;
        private long unreadCount;
        private LocalDateTime nextCursorCreatedAt;
        private Long nextCursorId;
    }
}
