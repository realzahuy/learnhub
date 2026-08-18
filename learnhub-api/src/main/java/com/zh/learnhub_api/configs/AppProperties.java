package com.zh.learnhub_api.configs;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration(proxyBeanMethods = false)
public final class AppProperties {

    public AppProperties() {
    }

    @ConfigurationProperties("app.pagination")
    public record Pagination(int defaultPageSize, int maxPageSize) {
    }

    @ConfigurationProperties("jwt")
    public record Jwt(String secret, Token accessToken, Token refreshToken) {

        public long accessTokenExpiration() {
            return accessToken.expiration();
        }

        public long refreshTokenExpiration() {
            return refreshToken.expiration();
        }

        public record Token(long expiration) {
        }
    }

    @ConfigurationProperties("app.auth")
    public record Auth(
            @DefaultValue("false") boolean refreshCookieSecure,
            @DefaultValue("Lax") String refreshCookieSameSite) {
    }

    @ConfigurationProperties("app.auth-cache")
    public record AuthCache(
            @DefaultValue("20000") long maximumSize,
            @DefaultValue("15") long expireAfterWriteMinutes) {
    }

    @ConfigurationProperties("app.cors")
    public record Cors(List<String> allowedOrigins) {
    }

    @ConfigurationProperties("momo")
    public record Momo(
            String partnerCode,
            String accessKey,
            String secretKey,
            String returnUrl,
            String notifyUrl) {
    }

    @ConfigurationProperties("app.payment")
    public record Payment(int expireMinutes) {
    }

    @ConfigurationProperties("app.verification")
    public record Verification(
            int codeLength,
            int expireMinutes,
            int resendCooldownSeconds,
            int maxAttempts) {
    }

    @ConfigurationProperties("app.password-reset")
    public record PasswordReset(
            int codeLength,
            int expireMinutes,
            int resendCooldownSeconds,
            int maxAttempts) {
    }

    @ConfigurationProperties("app.mail")
    public record Mail(String fromName) {
    }

    @ConfigurationProperties("spring.mail")
    public record SpringMail(String username) {
    }

    @ConfigurationProperties("aws.s3")
    public record AwsS3(
            String bucketRaw,
            String bucketHls,
            String region,
            String accessKey,
            String secretKey,
            PresignedUrl presignedUrl) {

        public record PresignedUrl(int expiration) {
        }
    }

    @ConfigurationProperties("aws.mediaconvert")
    public record AwsMediaConvert(String roleArn) {
    }

    @ConfigurationProperties("spring.cloud.aws.sqs.listener")
    public record AwsSqsListener(@DefaultValue("true") boolean autoStartup) {
    }

    @ConfigurationProperties("cloudinary")
    public record Cloudinary(
            String cloudName,
            String apiKey,
            String apiSecret,
            Folder folder) {

        public record Folder(String root, String avatar, String thumbnail) {
        }
    }

    @ConfigurationProperties("image")
    public record Image(
            long maxSize,
            String allowedTypes,
            Dimensions avatar,
            Dimensions thumbnail) {

        public record Dimensions(int width, int height) {
        }
    }

    @ConfigurationProperties("video")
    public record Video(long maxSize) {
    }

    @ConfigurationProperties("learnhub.quiz")
    public record Quiz(int passPercent) {
    }

    @ConfigurationProperties("learnhub.chat")
    public record Chat(int vectorCandidateLimit, int courseLimit, double minimumVectorScore) {
    }

    @ConfigurationProperties("learnhub.recommendation")
    public record Recommendation(
            int vectorCandidateLimit,
            double minimumVectorScore,
            double semanticWeight,
            double ratingPrior,
            double ratingPriorCount) {
    }

    @ConfigurationProperties("learnhub.ai")
    public record Ai(
            String chatSystemPrompt,
            int maxHistoryMessages,
            int embeddingDimension) {
    }

    @ConfigurationProperties("learnhub.ai")
    public record EmbeddingText(int embeddingMaxChars) {
    }

    @ConfigurationProperties("qdrant")
    public record Qdrant(
            String url,
            String apiKey,
            String collection,
            boolean enabled,
            long timeout) {
    }
}
