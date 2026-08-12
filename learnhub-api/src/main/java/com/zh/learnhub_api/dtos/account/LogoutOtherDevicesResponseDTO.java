package com.zh.learnhub_api.dtos.account;

public record LogoutOtherDevicesResponseDTO(
        String message,
        int loggedOutSessions) {
}
