package com.zh.learnhub_api.utils;

import com.zh.learnhub_api.pojo.UserActionCode;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;

public final class UserActionCodes {

    private static final SecureRandom RANDOM = new SecureRandom();

    private UserActionCodes() {
    }

    public static String generateNumericCode(int length) {
        if (length < 1 || length > 10) {
            throw new IllegalArgumentException("Độ dài mã phải nằm trong khoảng 1-10");
        }

        StringBuilder code = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            code.append(RANDOM.nextInt(10));
        }
        return code.toString();
    }

    public static long secondsUntilResend(UserActionCode code, LocalDateTime now,
                                          int cooldownSeconds) {
        long elapsed = Duration.between(code.getCreatedAt(), now).toSeconds();
        return Math.max(0, cooldownSeconds - elapsed);
    }
}
