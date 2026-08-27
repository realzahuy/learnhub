package com.zh.learnhub_api.services.media.s3;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.exceptions.ExternalServiceException;
import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.services.media.VideoStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import tools.jackson.databind.ObjectMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@ConditionalOnProperty(name = "video.storage.provider", havingValue = "s3")
@RequiredArgsConstructor
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
            return new PresignedUpload(uploadUrl, fields);
        } catch (Exception e) {
            throw new RuntimeException("Không thể tạo biểu mẫu tải video lên", e);
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
            throw new ResourceNotFoundException("Không tìm thấy tệp video");
        } catch (Exception e) {
            throw new ExternalServiceException("Không đọc được tệp video từ kho lưu trữ");
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
    public String generateRawObjectKey(
            Long courseId, Long lessonId, Long videoId, String fileName) {
        String extension = fileName.substring(fileName.lastIndexOf("."));
        String uuid = UUID.randomUUID().toString();
        return rawLessonPrefix(String.valueOf(courseId), String.valueOf(lessonId))
                + "videos/" + videoId + "/" + uuid + extension;
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
    public void deleteVideo(String objectKey) {
        s3Client.deleteObject(builder -> builder.bucket(properties.bucketRaw()).key(objectKey));
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
    public void deleteCourseVideos(Long courseId) {
        String id = String.valueOf(courseId);
        deletePrefix(properties.bucketRaw(), rawCoursePrefix(id));
        deletePrefix(properties.bucketHls(), hlsCoursePrefix(id));
    }

    @Override
    public void deleteLessonVideos(Long courseId, Long lessonId) {
        String course = String.valueOf(courseId);
        String lesson = String.valueOf(lessonId);
        deletePrefix(properties.bucketRaw(), rawLessonPrefix(course, lesson));
        deletePrefix(properties.bucketHls(), hlsLessonPrefix(course, lesson));
    }

    @Override
    public void deleteHlsOutputOf(String rawObjectKey) {
        String hlsPath = generateHlsOutputPath(rawObjectKey);
        deletePrefix(properties.bucketHls(), hlsPath);
    }

    private void deletePrefix(String bucket, String prefix) {
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

            s3Client.deleteObjects(DeleteObjectsRequest.builder()
                .bucket(bucket)
                .delete(Delete.builder().objects(keys).quiet(true).build())
                .build());
        }
    }
}
