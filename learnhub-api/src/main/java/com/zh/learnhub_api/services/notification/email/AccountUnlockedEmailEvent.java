package com.zh.learnhub_api.services.notification.email;

public record AccountUnlockedEmailEvent(
        String toEmail,
        String fullName) {
}
