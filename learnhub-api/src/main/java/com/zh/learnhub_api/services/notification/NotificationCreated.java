package com.zh.learnhub_api.services.notification;

import com.zh.learnhub_api.dtos.notification.NotificationResponseDTO;

public record NotificationCreated(Long recipientId, NotificationResponseDTO notification) {}
