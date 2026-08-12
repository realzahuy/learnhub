package com.zh.learnhub_api.messaging;

import com.zh.learnhub_api.services.media.VideoTranscodeCallbackService;
import io.awspring.cloud.sqs.annotation.SqsListener;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
@ConditionalOnProperty(name = "video.storage.provider", havingValue = "s3")
@RequiredArgsConstructor
@Slf4j
public class VideoJobEventConsumer {

    private final VideoTranscodeCallbackService videoTranscodeCallbackService;
    private final ObjectMapper objectMapper;

    @SqsListener(
            value = "${aws.sqs.video-events-queue-url}",
            factory = "videoJobSqsListenerContainerFactory")
    public void handle(String payload) throws JacksonException {
        JsonNode detail = objectMapper.readTree(payload).path("detail");
        String jobId = textOrNull(detail, "jobId");
        String status = textOrNull(detail, "status");

        if (jobId == null || status == null) {

            log.warn("Tin SQS thiếu jobId/status, bỏ qua: {}", payload);
            return;
        }

        videoTranscodeCallbackService.handleJobStateChange(
                jobId,
                status,
                extractDurationSeconds(detail),
                extractProgress(detail));
    }

    private Integer extractDurationSeconds(JsonNode detail) {
        for (JsonNode group : detail.path("outputGroupDetails")) {
            for (JsonNode output : group.path("outputDetails")) {
                JsonNode ms = output.path("durationInMs");
                if (ms.isNumber() && ms.asLong() > 0) {
                    return (int) Math.round(ms.asLong() / 1000.0);
                }
            }
        }
        return null;
    }

    private Integer extractProgress(JsonNode detail) {
        JsonNode progress = detail.path("jobProgress").path("jobPercentComplete");
        return progress.isNumber() ? progress.asInt() : null;
    }

    private String textOrNull(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isMissingNode() || value.isNull() ? null : value.asString();
    }
}
