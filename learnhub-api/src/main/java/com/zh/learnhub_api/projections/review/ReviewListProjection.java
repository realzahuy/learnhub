package com.zh.learnhub_api.projections.review;

import java.time.LocalDateTime;

public interface ReviewListProjection {
    Long getId();

    Integer getRating();

    String getComment();

    Long getUserId();

    String getUserFullName();

    String getUserAvatar();

    LocalDateTime getCreatedAt();

    LocalDateTime getUpdatedAt();
}
