package com.zh.learnhub_api.services.media.mediaconvert;

import com.zh.learnhub_api.configs.AppProperties;
import com.zh.learnhub_api.services.media.VideoStorageService;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.mediaconvert.MediaConvertClient;
import software.amazon.awssdk.services.mediaconvert.model.*;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MediaConvertTranscoder {

    private final MediaConvertClient mediaConvertClient;
    private final VideoStorageService videoStorageService;
    private final AppProperties.AwsMediaConvert awsProperties;
    private final AppProperties.MediaConvert mediaConvertProperties;

    public String createHlsTranscodingJob(
            String inputObjectKey, String outputPath, String clientRequestToken) {
        String inputUri = videoStorageService.getS3Uri(inputObjectKey);
        String outputUri = videoStorageService.getHlsS3Uri(outputPath);
        JobSettings jobSettings = buildJobSettings(inputUri, outputUri);
        CreateJobRequest createJobRequest = CreateJobRequest.builder()
            .role(awsProperties.roleArn())
            .settings(jobSettings)
            .statusUpdateInterval(StatusUpdateInterval.SECONDS_15)
            .clientRequestToken(clientRequestToken)
            .build();
        CreateJobResponse response = mediaConvertClient.createJob(createJobRequest);
        return response.job().id();
    }

    public void cancelJob(String jobId) {
        try {
            mediaConvertClient.cancelJob(CancelJobRequest.builder()
                .id(jobId)
                .build());
        } catch (Exception e) {
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
                            .segmentLength(6)
                            .manifestDurationFormat(HlsManifestDurationFormat.INTEGER)
                            .build()
                    )
                    .build()
            )
            .outputs(mediaConvertProperties.activeRenditions().stream()
                .map(this::buildOutput)
                .toList())
            .build();

        return JobSettings.builder()
            .inputs(input)
            .outputGroups(outputGroup)
            .build();
    }

    private Output buildOutput(AppProperties.MediaConvert.Rendition rendition) {
        return Output.builder()
            .nameModifier(rendition.nameModifier())
            .containerSettings(
                ContainerSettings.builder()
                    .container(ContainerType.M3_U8)
                    .build()
            )
            .videoDescription(
                VideoDescription.builder()
                    .width(rendition.width())
                    .height(rendition.height())
                    .codecSettings(
                        VideoCodecSettings.builder()
                            .codec(VideoCodec.H_264)
                            .h264Settings(
                                H264Settings.builder()
                                    .bitrate(rendition.videoBitrate())
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
                                    .bitrate(rendition.audioBitrate())
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
