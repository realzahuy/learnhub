package com.zh.learnhub_api.configs;

import com.paypal.sdk.Environment;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

import java.time.DateTimeException;
import java.time.Duration;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

@Configuration(proxyBeanMethods = false)
public final class AppProperties {

    public AppProperties() {
    }

    @Validated
    @ConfigurationProperties("app")
    public record Time(
            @NotBlank String timeZone,
            @NotBlank String dbSessionTimeZone) {

        @AssertTrue(message = "app.time-zone và app.db-session-time-zone phải là múi giờ hợp lệ")
        public boolean isValidTimeZones() {
            try {
                ZoneId.of(timeZone);
                ZoneOffset.of(dbSessionTimeZone);
                return true;
            } catch (DateTimeException | NullPointerException ex) {
                return false;
            }
        }
    }

    @Validated
    @ConfigurationProperties("app.pagination")
    public record Pagination(
            @Positive int defaultPageSize,
            @Positive int maxPageSize) {

        @AssertTrue(message = "Kích thước trang mặc định không được vượt quá kích thước trang tối đa")
        public boolean isDefaultWithinMaximum() {
            return defaultPageSize <= maxPageSize;
        }
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

        @AssertTrue(message = "SameSite=None yêu cầu cookie làm mới phải bật Secure")
        public boolean isSameSiteCompatibleWithSecureCookie() {
            return !"None".equalsIgnoreCase(refreshCookieSameSite) || refreshCookieSecure;
        }
    }

    @Validated
    @ConfigurationProperties("app.auth-cache")
    public record AuthCache(
            @Positive long maximumSize,
            @Positive long expireAfterWriteMinutes,
            @Positive long generationExtraTtlMinutes) {
    }

    @Validated
    @ConfigurationProperties("app.video-playback-cache")
    public record VideoPlaybackCache(
            @Positive long metadataMaximumSize,
            @Positive long metadataExpireAfterWriteMinutes,
            @Positive long accessMaximumSize,
            @Positive long accessExpireAfterWriteMinutes) {
    }

    @Validated
    @ConfigurationProperties("app.cache")
    public record ApplicationCache(
            @NotNull @Valid CacheSpec roleIds,
            @NotNull @Valid CacheSpec categories,
            @NotNull @Valid CacheSpec adminOverview,
            @NotNull @Valid CacheSpec adminTimeSeries,
            @NotNull @Valid CacheSpec instructorOverview,
            @NotNull @Valid CacheSpec instructorTimeSeries,
            @NotNull @Valid CacheSpec queryEmbeddings,
            @NotNull @Valid CacheSpec courseRatingStats,
            @NotNull @Valid CacheSpec courseRatingSummaries,
            @NotNull @Valid CacheSpec instructorRatingStats,
            @NotNull @Valid CacheSpec publicCourseDetails,
            @NotNull @Valid CacheSpec publicInstructorProfiles,
            @NotNull @Valid CacheSpec publicCourseCatalog) {
    }

    public record CacheSpec(
            @Positive long maximumSize,
            @NotNull Duration expireAfterWrite) {

        @AssertTrue(message = "expire-after-write của bộ nhớ đệm phải lớn hơn 0")
        public boolean isExpireAfterWritePositive() {
            return expireAfterWrite != null
                    && !expireAfterWrite.isZero()
                    && !expireAfterWrite.isNegative();
        }
    }

    @Validated
    @ConfigurationProperties("app.sse")
    public record Sse(
            @Positive long timeoutMs,
            @Positive long heartbeatMs) {

        @AssertTrue(message = "Chu kỳ gửi tín hiệu SSE phải ngắn hơn thời gian chờ kết nối")
        public boolean isHeartbeatShorterThanTimeout() {
            return heartbeatMs < timeoutMs;
        }
    }

    @Validated
    @ConfigurationProperties("app.scheduler")
    public record Scheduler(
            @Positive long sessionCleanupDelayMs,
            @Positive long paymentExpirationScanDelayMs) {
    }

    @Validated
    @ConfigurationProperties("app.hls")
    public record Hls(@PositiveOrZero long privateCacheMaxAgeSeconds) {
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
    public record Payment(@Positive int expireMinutes) {
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
    @ConfigurationProperties("aws.mediaconvert")
    public record AwsMediaConvert(@NotBlank String roleArn) {
    }

    @Validated
    @ConfigurationProperties("app.media-convert")
    public record MediaConvert(
            @NotBlank String activeProfile,
            @NotEmpty Map<@NotBlank String, @NotEmpty List<@NotNull @Valid Rendition>> profiles) {

        @AssertTrue(message = "Profile MediaConvert đang hoạt động phải tồn tại và có ít nhất một rendition")
        public boolean isActiveProfileValid() {
            return activeProfile != null
                    && profiles != null
                    && profiles.get(activeProfile) != null
                    && !profiles.get(activeProfile).isEmpty();
        }

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

        @AssertTrue(message = "Các khoảng thời gian chờ AWS phải thỏa mãn: kết nối < mỗi lần thử <= tổng thời gian")
        public boolean isTimeoutOrderValid() {
            return isPositive(connectionTimeout)
                    && isPositive(apiCallAttemptTimeout)
                    && isPositive(apiCallTimeout)
                    && connectionTimeout.compareTo(apiCallAttemptTimeout) < 0
                    && apiCallAttemptTimeout.compareTo(apiCallTimeout) <= 0;
        }

        private static boolean isPositive(Duration value) {
            return value != null && !value.isZero() && !value.isNegative();
        }
    }

    @Validated
    @ConfigurationProperties("spring.cloud.aws.sqs.listener")
    public record AwsSqsListener(
            boolean autoStartup,
            @Positive int maxConcurrentMessages,
            @Positive int maxMessagesPerPoll,
            @NotNull Duration pollTimeout) {

        @AssertTrue(message = "Thời gian chờ lấy tin nhắn SQS phải từ 0 đến 20 giây")
        public boolean isPollTimeoutValid() {
            return pollTimeout != null
                    && !pollTimeout.isZero()
                    && !pollTimeout.isNegative()
                    && pollTimeout.compareTo(Duration.ofSeconds(20)) <= 0;
        }

        @AssertTrue(message = "Số tin nhắn SQS mỗi lần lấy không được vượt quá số tin nhắn xử lý đồng thời")
        public boolean isPollBatchWithinConcurrency() {
            return maxMessagesPerPoll <= maxConcurrentMessages;
        }
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
    @ConfigurationProperties("learnhub.chat")
    public record Chat(
            @Positive int courseLimit,
            @DecimalMin("-1.0") @DecimalMax("1.0") double minimumVectorScore) {
    }

    @Validated
    @ConfigurationProperties("learnhub.vector-search")
    public record VectorSearch(@Min(1) @Max(100) int candidateLimit) {
    }

    @Validated
    @ConfigurationProperties("learnhub.recommendation")
    public record Recommendation(
            @DecimalMin("-1.0") @DecimalMax("1.0") double minimumVectorScore,
            @DecimalMin("0.0") @DecimalMax("1.0") double semanticWeight,
            @DecimalMin("1.0") @DecimalMax("5.0") double ratingPrior,
            @PositiveOrZero double ratingPriorCount,
            @Positive int resultLimit) {
    }

    @Validated
    @ConfigurationProperties("learnhub.ai")
    public record Ai(
            @NotBlank String chatSystemPrompt,
            @PositiveOrZero int maxHistoryMessages,
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

        @AssertTrue(message = "URL và tên bộ sưu tập Qdrant là bắt buộc khi bật Qdrant")
        public boolean isEnabledConfigurationComplete() {
            return !enabled || (hasText(url) && hasText(collection));
        }

        private static boolean hasText(String value) {
            return value != null && !value.isBlank();
        }
    }
}
