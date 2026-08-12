package com.zh.learnhub_api.services.media.mediaconvert;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.services.media.VideoStorageService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.mediaconvert.MediaConvertClient;
import software.amazon.awssdk.services.mediaconvert.model.*;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class MediaConvertTranscoder {

    private final MediaConvertClient mediaConvertClient;
    private final VideoStorageService videoStorageService;
    private final AppProperties.AwsMediaConvert properties;

    public String createHlsTranscodingJob(String inputObjectKey, String outputPath) {
        try {

            String inputUri = videoStorageService.getS3Uri(inputObjectKey);

            String outputUri = videoStorageService.getHlsS3Uri(outputPath);

            log.info("Creating MediaConvert job - Input (RAW): {}, Output (HLS): {}", inputUri, outputUri);

            JobSettings jobSettings = buildJobSettings(inputUri, outputUri);

            CreateJobRequest createJobRequest = CreateJobRequest.builder()
                .role(properties.roleArn())
                .settings(jobSettings)
                .statusUpdateInterval(StatusUpdateInterval.SECONDS_15)
                .build();

            CreateJobResponse response = mediaConvertClient.createJob(createJobRequest);
            String jobId = response.job().id();

            log.info("MediaConvert job created successfully. Job ID: {}", jobId);
            return jobId;

        } catch (Exception e) {
            log.error("Failed to create MediaConvert job for input: {}", inputObjectKey, e);
            throw new RuntimeException("Failed to create transcoding job", e);
        }
    }

    public boolean cancelJob(String jobId) {
        try {
            mediaConvertClient.cancelJob(CancelJobRequest.builder()
                .id(jobId)
                .build());

            log.info("Cancelled MediaConvert job: {}", jobId);
            return true;

        } catch (Exception e) {
            log.warn("Could not cancel MediaConvert job {}: {}", jobId, e.getMessage());
            return false;
        }
    }

    private JobSettings buildJobSettings(String inputUri, String outputUri) {

        Map<String, AudioSelector> audioSelectors = new HashMap<>();
        audioSelectors.put("DEFAULT", AudioSelector.builder()
            .defaultSelection(AudioDefaultSelection.DEFAULT)
            .build());

        Input input = Input.builder()
            .fileInput(inputUri)
            .audioSelectors(audioSelectors)
            .videoSelector(VideoSelector.builder()
                .rotate(InputRotate.AUTO)
                .build())
            .build();

        OutputGroup outputGroup = OutputGroup.builder()
            .name("HLS Group")
            .outputGroupSettings(
                OutputGroupSettings.builder()
                    .type(OutputGroupType.HLS_GROUP_SETTINGS)
                    .hlsGroupSettings(
                        HlsGroupSettings.builder()
                            .destination(outputUri)
                            .minSegmentLength(0)
                            .segmentLength(10)
                            .manifestDurationFormat(HlsManifestDurationFormat.INTEGER)
                            .build()
                    )
                    .build()
            )
            .outputs(

                buildOutput("720p", 1280, 720, 2500000),

                buildOutput("480p", 854, 480, 1000000)
            )
            .build();

        return JobSettings.builder()
            .inputs(input)
            .outputGroups(outputGroup)
            .build();
    }

    private Output buildOutput(String nameModifier, int width, int height, int bitrate) {
        return Output.builder()
            .nameModifier(nameModifier)
            .containerSettings(
                ContainerSettings.builder()
                    .container(ContainerType.M3_U8)
                    .build()
            )
            .videoDescription(
                VideoDescription.builder()
                    .width(width)
                    .height(height)
                    .codecSettings(
                        VideoCodecSettings.builder()
                            .codec(VideoCodec.H_264)
                            .h264Settings(
                                H264Settings.builder()
                                    .bitrate(bitrate)
                                    .rateControlMode(H264RateControlMode.CBR)
                                    .codecProfile(H264CodecProfile.MAIN)
                                    .build()
                            )
                            .build()
                    )
                    .build()
            )
            .audioDescriptions(
                AudioDescription.builder()
                    .audioSourceName("DEFAULT")
                    .codecSettings(
                        AudioCodecSettings.builder()
                            .codec(AudioCodec.AAC)
                            .aacSettings(
                                AacSettings.builder()
                                    .bitrate(96000)
                                    .codingMode(AacCodingMode.CODING_MODE_2_0)
                                    .sampleRate(48000)
                                    .build()
                            )
                            .build()
                    )
                    .build()
            )
            .build();
    }
}
