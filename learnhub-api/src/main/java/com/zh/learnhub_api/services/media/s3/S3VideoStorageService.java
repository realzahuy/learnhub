package com.zh.learnhub_api.services.media.s3;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.exceptions.VideoProcessingException;
import com.zh.learnhub_api.services.media.VideoStorageService;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

@Service
@ConditionalOnProperty(name = "video.storage.provider", havingValue = "s3")
@RequiredArgsConstructor
@Slf4j
public class S3VideoStorageService implements VideoStorageService {

    private static final DateTimeFormatter AMZ_DATE_FORMAT =
            DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC);
    private static final DateTimeFormatter DATE_STAMP_FORMAT =
            DateTimeFormatter.ofPattern("yyyyMMdd").withZone(ZoneOffset.UTC);

    private final S3Client s3Client;
    private final AppProperties.AwsS3 properties;
    private final ObjectMapper objectMapper;

    @Override
    public PresignedUpload generatePresignedUpload(
            String objectKey, String contentType, long maxSizeBytes) {
        try {
            Instant now = Instant.now();
            String amzDate = AMZ_DATE_FORMAT.format(now);
            String dateStamp = DATE_STAMP_FORMAT.format(now);
            String credentialScope = String.format(
                    "%s/%s/s3/aws4_request", dateStamp, properties.region());
            String credential = properties.accessKey() + "/" + credentialScope;

            List<Object> conditions = new ArrayList<>();
            conditions.add(Map.of("bucket", properties.bucketRaw()));
            conditions.add(Map.of("key", objectKey));
            conditions.add(Map.of("Content-Type", contentType));
            conditions.add(List.of("content-length-range", 1, maxSizeBytes));
            conditions.add(Map.of("x-amz-algorithm", "AWS4-HMAC-SHA256"));
            conditions.add(Map.of("x-amz-credential", credential));
            conditions.add(Map.of("x-amz-date", amzDate));

            Map<String, Object> policyDocument = new LinkedHashMap<>();
            policyDocument.put("expiration", now
                    .plusSeconds(properties.presignedUrl().expiration()).toString());
            policyDocument.put("conditions", conditions);

            String policy = Base64.getEncoder().encodeToString(
                    objectMapper.writeValueAsBytes(policyDocument));
            String signature = signPolicy(policy, dateStamp);

            Map<String, String> fields = new LinkedHashMap<>();
            fields.put("key", objectKey);
            fields.put("Content-Type", contentType);
            fields.put("policy", policy);
            fields.put("x-amz-algorithm", "AWS4-HMAC-SHA256");
            fields.put("x-amz-credential", credential);
            fields.put("x-amz-date", amzDate);
            fields.put("x-amz-signature", signature);

            String uploadUrl = String.format(
                    "https://%s.s3.%s.amazonaws.com/",
                    properties.bucketRaw(), properties.region());
            log.info("Generated presigned POST for RAW bucket key: {}, max size: {} bytes",
                    objectKey, maxSizeBytes);
            return new PresignedUpload(uploadUrl, fields);
        } catch (Exception e) {
            log.error("Failed to generate presigned POST for key: {}", objectKey, e);
            throw new RuntimeException("Failed to generate upload form", e);
        }
    }

    private String signPolicy(String policy, String dateStamp) throws Exception {
        byte[] dateKey = hmac(
                ("AWS4" + properties.secretKey()).getBytes(StandardCharsets.UTF_8),
                dateStamp);
        byte[] regionKey = hmac(dateKey, properties.region());
        byte[] serviceKey = hmac(regionKey, "s3");
        byte[] signingKey = hmac(serviceKey, "aws4_request");
        return HexFormat.of().formatHex(hmac(signingKey, policy));
    }

    private byte[] hmac(byte[] key, String value) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        return mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public Long findObjectSize(String objectKey) {
        try {

            HeadObjectRequest headObjectRequest = HeadObjectRequest.builder()
                .bucket(properties.bucketRaw())
                .key(objectKey)
                .build();

            long size = s3Client.headObject(headObjectRequest).contentLength();
            log.info("Object exists in RAW bucket: {} ({} bytes)", objectKey, size);
            return size;

        } catch (NoSuchKeyException e) {
            log.warn("Object not found in RAW bucket: {}", objectKey);
            return null;
        } catch (Exception e) {
            log.error("Error checking object existence: {}", objectKey, e);
            throw new RuntimeException("Failed to verify object existence", e);
        }
    }

    @Override
    public StoredObject openHlsObject(String objectKey) {
        try {
            var response = s3Client.getObject(GetObjectRequest.builder()
                .bucket(properties.bucketHls())
                .key(objectKey)
                .build());

            return new StoredObject(
                response,
                response.response().contentLength(),
                contentTypeOf(objectKey));

        } catch (NoSuchKeyException e) {
            log.warn("Không tìm thấy file HLS: {}", objectKey);
            throw new ResourceNotFoundException("Không tìm thấy file video");
        } catch (Exception e) {
            log.error("Lỗi đọc file HLS: {}", objectKey, e);
            throw new VideoProcessingException("Không đọc được file video từ kho lưu trữ");
        }
    }

    private String contentTypeOf(String objectKey) {
        if (objectKey.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
        if (objectKey.endsWith(".ts")) return "video/mp2t";
        if (objectKey.endsWith(".m4s") || objectKey.endsWith(".mp4")) return "video/mp4";
        return "application/octet-stream";
    }

    private String rawCoursePrefix(String courseId) {
        return String.format("raw/courses/%s/", courseId);
    }

    private String rawLessonPrefix(String courseId, String lessonId) {
        return String.format("%slessons/%s/", rawCoursePrefix(courseId), lessonId);
    }

    private String hlsCoursePrefix(String courseId) {
        return String.format("hls/courses/%s/", courseId);
    }

    private String hlsLessonPrefix(String courseId, String lessonId) {
        return String.format("%slessons/%s/", hlsCoursePrefix(courseId), lessonId);
    }

    @Override
    public String generateRawObjectKey(Long courseId, Long lessonId, String fileName) {
        String extension = fileName.substring(fileName.lastIndexOf("."));
        String uuid = UUID.randomUUID().toString();
        return rawLessonPrefix(String.valueOf(courseId), String.valueOf(lessonId)) + uuid + extension;
    }

    private String baseName(String objectKey) {
        String fileName = objectKey.substring(objectKey.lastIndexOf('/') + 1);
        int dot = fileName.lastIndexOf('.');
        return dot < 0 ? fileName : fileName.substring(0, dot);
    }

    @Override
    public String generateHlsOutputPath(String rawObjectKey) {

        String[] parts = rawObjectKey.split("/");
        return hlsLessonPrefix(parts[2], parts[4]) + baseName(rawObjectKey) + "/";
    }

    @Override
    public String generateMasterPlaylistKey(String rawObjectKey) {

        return generateHlsOutputPath(rawObjectKey) + baseName(rawObjectKey) + ".m3u8";
    }

    @Override
    public void deleteVideo(String objectKey) throws IOException {
        try {

            s3Client.deleteObject(builder ->
                builder.bucket(properties.bucketRaw()).key(objectKey)
            );
            log.info("Deleted object from RAW bucket: {}", objectKey);
        } catch (S3Exception e) {
            log.error("S3 delete error: {}", e.awsErrorDetails().errorMessage());
            throw new IOException("Failed to delete S3 object: " + e.awsErrorDetails().errorMessage(), e);
        }
    }

    @Override
    public String getS3Uri(String objectKey) {

        return String.format("s3://%s/%s", properties.bucketRaw(), objectKey);
    }

    @Override
    public String getHlsS3Uri(String hlsPath) {

        return String.format("s3://%s/%s", properties.bucketHls(), hlsPath);
    }

    @Override
    public int deleteCourseVideos(Long courseId) {
        String id = String.valueOf(courseId);

        int deleted = deletePrefix(properties.bucketRaw(), rawCoursePrefix(id))
                + deletePrefix(properties.bucketHls(), hlsCoursePrefix(id));

        log.info("Deleted {} video object(s) of course {} from S3", deleted, courseId);
        return deleted;
    }

    @Override
    public int deleteLessonVideos(Long courseId, Long lessonId) {
        String course = String.valueOf(courseId);
        String lesson = String.valueOf(lessonId);
        int deleted = deletePrefix(properties.bucketRaw(), rawLessonPrefix(course, lesson))
                + deletePrefix(properties.bucketHls(), hlsLessonPrefix(course, lesson));

        log.info("Deleted {} video object(s) of lesson {} from S3", deleted, lessonId);
        return deleted;
    }

    @Override
    public int deleteHlsOutputOf(String rawObjectKey) {
        try {

            String hlsPath = generateHlsOutputPath(rawObjectKey);
            int deleted = deletePrefix(properties.bucketHls(), hlsPath);

            log.info("Deleted {} HLS object(s) under {} (derived from raw key {})",
                     deleted, hlsPath, rawObjectKey);
            return deleted;

        } catch (Exception e) {

            log.error("Failed to derive HLS path from raw key {}", rawObjectKey, e);
            return 0;
        }
    }

    private int deletePrefix(String bucket, String prefix) {
        int deleted = 0;

        try {
            ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                .bucket(bucket)
                .prefix(prefix)
                .build();

            for (ListObjectsV2Response page : s3Client.listObjectsV2Paginator(listRequest)) {
                List<ObjectIdentifier> keys = page.contents().stream()
                    .map(object -> ObjectIdentifier.builder().key(object.key()).build())
                    .toList();

                if (keys.isEmpty()) {
                    continue;
                }

                DeleteObjectsResponse response = s3Client.deleteObjects(DeleteObjectsRequest.builder()
                    .bucket(bucket)
                    .delete(Delete.builder().objects(keys).quiet(true).build())
                    .build());

                deleted += keys.size() - response.errors().size();
                response.errors().forEach(error -> log.error(
                    "Failed to delete object {} in bucket {}: {}", error.key(), bucket, error.message()));
            }
        } catch (Exception e) {

            log.error("Failed to delete objects under prefix {} in bucket {}", prefix, bucket, e);
        }

        return deleted;
    }
}
