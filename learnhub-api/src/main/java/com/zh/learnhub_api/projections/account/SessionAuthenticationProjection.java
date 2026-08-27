package com.zh.learnhub_api.projections.account;

import com.zh.learnhub_api.enums.AccountStatus;

import java.time.LocalDateTime;

public interface SessionAuthenticationProjection {
    Long getUserId();

    AccountStatus getAccountStatus();

    LocalDateTime getExpiresAt();
}
