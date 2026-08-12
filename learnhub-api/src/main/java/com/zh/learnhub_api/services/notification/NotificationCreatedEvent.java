package com.zh.learnhub_api.services.notification;

import com.zh.learnhub_api.dtos.notification.NotificationResponseDTO;

public record NotificationCreatedEvent(
        Long recipientId,
        NotificationResponseDTO notification) {
}
