package com.zh.learnhub_api.configs;

import com.paypal.sdk.Environment;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Configuration(proxyBeanMethods = false)
public final class AppProperties {

    @Validated
    @ConfigurationProperties("app")
    public record Time(
            @NotBlank String timeZone,
            @NotBlank String dbSessionTimeZone) {
    }

    @Validated
    @ConfigurationProperties("app.pagination")
    public record Pagination(
            @Positive int defaultPageSize,
            @Positive int maxPageSize) {
    }

    @Validated
    @ConfigurationProperties("app.stats")
    public record Stats(
            @Positive int overviewPeriodDays,
            @Positive int maxDayBuckets,
            @Positive int maxMonthBuckets,
            @Positive int maxQuarterBuckets) {
    }

    @Validated
    @ConfigurationProperties("jwt")
    public record Jwt(
            @NotBlank String secret,
            @NotNull @Valid Token accessToken,
            @NotNull @Valid Token refreshToken) {

        public long accessTokenExpiration() {
            return accessToken.expiration();
        }

        public long refreshTokenExpiration() {
            return refreshToken.expiration();
        }

        public record Token(@Positive long expiration) {
        }
    }

    @Validated
    @ConfigurationProperties("app.auth")
    public record Auth(
            boolean refreshCookieSecure,
            @NotBlank
            @Pattern(regexp = "(?i)Strict|Lax|None")
            String refreshCookieSameSite) {
    }

    @Validated
    @ConfigurationProperties("app.cache")
    public record ApplicationCache(
            @NotNull @Valid CacheSpec categories,
            @NotNull @Valid CacheSpec courseRatingStats,
            @NotNull @Valid CacheSpec courseRatingSummaries,
            @NotNull @Valid CacheSpec publicCourseDetails,
            @NotNull @Valid CacheSpec publicCourseCatalog) {
    }

    public record CacheSpec(
            @Positive long maximumSize,
            @NotNull Duration expireAfterWrite) {
    }

    @Validated
    @ConfigurationProperties("app.sse")
    public record Sse(
            @Positive long timeoutMs,
            @Positive long heartbeatMs) {
    }

    @Validated
    @ConfigurationProperties("app.scheduler")
    public record Scheduler(
            @Positive long sessionCleanupDelayMs,
            @Positive long paymentExpirationScanDelayMs) {
    }

    @Validated
    @ConfigurationProperties("app.cors")
    public record Cors(
            @NotEmpty List<@NotBlank String> allowedOrigins,
            @NotEmpty List<@NotBlank String> allowedMethods,
            @NotEmpty List<@NotBlank String> allowedHeaders,
            boolean allowCredentials) {
    }

    @Validated
    @ConfigurationProperties("app.video")
    public record VideoManagement(@Positive int statusBatchLimit) {
    }

    @Validated
    @ConfigurationProperties("momo")
    public record Momo(
            @NotBlank String partnerCode,
            @NotBlank String accessKey,
            @NotBlank String secretKey,
            @NotBlank String returnUrl,
            @NotBlank String notifyUrl) {
    }

    @Validated
    @ConfigurationProperties("paypal")
    public record Paypal(
            @NotBlank String clientId,
            @NotBlank String clientSecret,
            @NotNull Environment environment,
            @NotBlank String returnUrl,
            @NotBlank String cancelUrl,
            @NotBlank @Pattern(regexp = "[A-Z]{3}") String currency) {
    }

    @Validated
    @ConfigurationProperties("app.payment")
    public record Payment(@NotBlank String brand, @Positive int expireMinutes) {
    }

    @Validated
    @ConfigurationProperties("app.verification")
    public record Verification(
            @Min(1) @Max(10) int codeLength,
            @Positive int expireMinutes,
            @PositiveOrZero int resendCooldownSeconds,
            @Positive int maxAttempts) {
    }

    @Validated
    @ConfigurationProperties("app.password-reset")
    public record PasswordReset(
            @Min(1) @Max(10) int codeLength,
            @Positive int expireMinutes,
            @PositiveOrZero int resendCooldownSeconds,
            @Positive int maxAttempts) {
    }

    @Validated
    @ConfigurationProperties("app.mail")
    public record Mail(@NotBlank String fromName) {
    }

    @Validated
    @ConfigurationProperties("spring.mail")
    public record SpringMail(@NotBlank String username) {
    }

    @Validated
    @ConfigurationProperties("aws.s3")
    public record AwsS3(
            @NotBlank String bucketRaw,
            @NotBlank String bucketHls,
            @NotBlank String region,
            @NotBlank String accessKey,
            @NotBlank String secretKey,
            @NotNull @Valid PresignedUrl presignedUrl) {

        public record PresignedUrl(@Positive int expiration) {
        }
    }

    @Validated
    @ConfigurationProperties("aws.cloudfront")
    public record AwsCloudFront(
            @NotBlank String baseUrl,
            @NotBlank String keyPairId,
            @NotBlank String privateKeyPath,
            @Positive long cookieExpiration) {
    }

    @Validated
    @ConfigurationProperties("aws.mediaconvert")
    public record AwsMediaConvert(@NotBlank String roleArn) {
    }

    @Validated
    @ConfigurationProperties("app.media-convert")
    public record MediaConvert(
            @NotBlank String activeProfile,
            @NotEmpty Map<@NotBlank String, @NotEmpty List<@NotNull @Valid Rendition>> profiles) {

        public List<Rendition> activeRenditions() {
            return List.copyOf(profiles.get(activeProfile));
        }

        public record Rendition(
                @NotBlank
                @Pattern(regexp = "[A-Za-z0-9_-]+")
                String nameModifier,
                @Positive int width,
                @Positive int height,
                @Positive int videoBitrate,
                @Positive int audioBitrate) {
        }
    }

    @Validated
    @ConfigurationProperties("aws.client")
    public record AwsClient(
            @NotNull Duration connectionTimeout,
            @NotNull Duration apiCallAttemptTimeout,
            @NotNull Duration apiCallTimeout,
            @Min(1) @Max(10) int maxAttempts) {
    }

    @Validated
    @ConfigurationProperties("spring.cloud.aws.sqs.listener")
    public record AwsSqsListener(
            boolean autoStartup,
            @Positive int maxConcurrentMessages,
            @Positive int maxMessagesPerPoll,
            @NotNull Duration pollTimeout) {
    }

    @Validated
    @ConfigurationProperties("cloudinary")
    public record Cloudinary(
            @NotBlank String cloudName,
            @NotBlank String apiKey,
            @NotBlank String apiSecret,
            @NotNull @Valid Folder folder) {

        public record Folder(
                @NotBlank String root,
                @NotBlank String avatar,
                @NotBlank String thumbnail) {
        }
    }

    @Validated
    @ConfigurationProperties("image")
    public record Image(
            @Positive long maxSize,
            @NotBlank String allowedTypes,
            @NotNull @Valid Dimensions avatar,
            @NotNull @Valid Dimensions thumbnail) {

        public record Dimensions(
                @Positive int width,
                @Positive int height) {
        }
    }

    @Validated
    @ConfigurationProperties("video")
    public record Video(@Positive long maxSize) {
    }

    @Validated
    @ConfigurationProperties("learnhub.quiz")
    public record Quiz(@Min(0) @Max(100) int passPercent) {
    }

    @Validated
    @ConfigurationProperties("learnhub.recommendation")
    public record Recommendation(
            @DecimalMin("-1.0") @DecimalMax("1.0") double minimumVectorScore,
            @Positive int resultLimit) {
    }

    @Validated
    @ConfigurationProperties("learnhub.ai")
    public record Ai(
            @NotBlank String chatSystemPrompt,
            @Positive int embeddingDimension) {
    }

    @Validated
    @ConfigurationProperties("learnhub.ai")
    public record EmbeddingText(@Min(1000) int embeddingMaxChars) {
    }

    @Validated
    @ConfigurationProperties("qdrant")
    public record Qdrant(
            String url,
            String apiKey,
            String collection,
            boolean enabled,
            @Positive long timeout) {
    }
}
