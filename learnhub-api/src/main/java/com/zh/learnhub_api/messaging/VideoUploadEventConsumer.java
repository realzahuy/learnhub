package com.zh.learnhub_api.messaging;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.services.media.VideoUploadService;
import io.awspring.cloud.sqs.annotation.SqsListener;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@ConditionalOnProperty(name = "video.storage.provider", havingValue = "s3")
@RequiredArgsConstructor
public class VideoUploadEventConsumer {

    private static final Pattern VIDEO_OBJECT_KEY = Pattern.compile(
            "^raw/courses/\\d+/lessons/\\d+/videos/(\\d+)/[^/]+$");

    private final VideoUploadService videoUploadService;
    private final ObjectMapper objectMapper;
    private final AppProperties.AwsS3 s3Properties;

    @SqsListener(
            value = "${aws.sqs.video-upload-events-queue-url}",
            factory = "videoJobSqsListenerContainerFactory")
    public void handle(String payload) throws JacksonException {
        JsonNode event = objectMapper.readTree(payload);
        if (!"aws.s3".equals(textOrNull(event, "source"))
                || !"Object Created".equals(textOrNull(event, "detail-type"))) {
            return;
        }
        JsonNode detail = event.path("detail");

        String bucket = textOrNull(detail.path("bucket"), "name");
        String objectKey = textOrNull(detail.path("object"), "key");
        if (!s3Properties.bucketRaw().equals(bucket) || objectKey == null) {
            return;
        }

        Matcher matcher = VIDEO_OBJECT_KEY.matcher(objectKey);
        if (!matcher.matches()) {
            return;
        }

        Long videoId = Long.valueOf(matcher.group(1));
        videoUploadService.processUploadedObject(videoId, objectKey);
    }

    private String textOrNull(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isMissingNode() || value.isNull() ? null : value.asString();
    }
}
