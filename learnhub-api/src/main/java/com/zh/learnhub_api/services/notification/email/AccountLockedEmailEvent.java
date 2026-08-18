package com.zh.learnhub_api.services.notification.email;

public record AccountLockedEmailEvent(
        String toEmail,
        String fullName,
        String adminEmail) {
}
