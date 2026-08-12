package com.zh.learnhub_api.configs;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.regions.providers.AwsRegionProvider;
import software.amazon.awssdk.services.mediaconvert.MediaConvertClient;

@Configuration
@ConditionalOnProperty(name = "video.storage.provider", havingValue = "s3")
public class MediaConvertConfig {

    @Bean
    public MediaConvertClient mediaConvertClient(
            AwsCredentialsProvider credentialsProvider,
            AwsRegionProvider regionProvider) {
        return MediaConvertClient.builder()
            .region(regionProvider.getRegion())
            .credentialsProvider(credentialsProvider)
            .build();
    }
}
