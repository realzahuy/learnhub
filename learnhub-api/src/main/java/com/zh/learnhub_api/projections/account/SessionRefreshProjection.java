package com.zh.learnhub_api.projections.account;

import com.zh.learnhub_api.enums.AccountStatus;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

public interface SessionRefreshProjection {
    Long getSessionId();

    String getRefreshTokenHash();

    LocalDateTime getExpiresAt();

    Long getUserId();

    String getUsername();

    String getFullName();

    String getAvatar();

    AccountStatus getAccountStatus();

    String getRoleNames();

    default List<String> getRoles() {
        String roleNames = getRoleNames();
        if (roleNames == null || roleNames.isBlank()) {
            return List.of();
        }
        return Arrays.stream(roleNames.split(",")).map(String::trim).toList();
    }
}
