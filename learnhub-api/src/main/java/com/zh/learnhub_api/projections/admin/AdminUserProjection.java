package com.zh.learnhub_api.projections.admin;

import com.zh.learnhub_api.enums.AccountStatus;

import java.time.LocalDateTime;

public interface AdminUserProjection {
    Long getId();
    String getUsername();
    String getEmail();
    String getFullName();
    String getAvatar();
    String getBio();
    boolean isEmailVerified();
    AccountStatus getAccountStatus();
    LocalDateTime getCreatedAt();
    LocalDateTime getLastLogin();
}
