package com.zh.learnhub_api.projections.admin;

import java.time.LocalDateTime;

public interface AdminUserProjection {
    Long getId();
    String getUsername();
    String getEmail();
    String getFullName();
    String getAvatar();
    String getBio();
    boolean isEmailVerified();
    LocalDateTime getCreatedAt();
    LocalDateTime getLastLogin();
}
