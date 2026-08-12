package com.zh.learnhub_api.dtos.account;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PasswordResetStatusDTO {
    private String message;
    private long expiresInSeconds;
    private long resendAfterSeconds;
}
