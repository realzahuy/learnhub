package com.zh.learnhub_api.projections.instructor;

import java.time.LocalDateTime;

public interface PublicInstructorProjection {
    Long getId();

    String getFullName();

    String getAvatar();

    String getBio();

    LocalDateTime getJoinedAt();
}
