package com.zh.learnhub_api.dtos.account;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmailVerificationStatusDTO {
    private String email;
    private long expiresInSeconds;
    private long resendAfterSeconds;

    public static EmailVerificationStatusDTO pending(
            String maskedEmail, long expiresInSeconds, long resendAfterSeconds) {
        return new EmailVerificationStatusDTO(maskedEmail, expiresInSeconds, resendAfterSeconds);
    }
}
