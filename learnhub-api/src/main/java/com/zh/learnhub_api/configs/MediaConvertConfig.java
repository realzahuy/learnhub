package com.zh.learnhub_api.configs;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.http.apache5.Apache5HttpClient;
import software.amazon.awssdk.regions.providers.AwsRegionProvider;
import software.amazon.awssdk.services.mediaconvert.MediaConvertClient;

@Configuration
@ConditionalOnProperty(name = "video.storage.provider", havingValue = "s3")
public class MediaConvertConfig {

    @Bean
    public MediaConvertClient mediaConvertClient(
            AwsCredentialsProvider credentialsProvider,
            AwsRegionProvider regionProvider,
            AppProperties.AwsClient clientProperties) {
        return MediaConvertClient.builder()
            .region(regionProvider.getRegion())
            .credentialsProvider(credentialsProvider)
            .httpClientBuilder(Apache5HttpClient.builder()
                    .connectionTimeout(clientProperties.connectionTimeout()))
            .overrideConfiguration(override -> override
                    .apiCallAttemptTimeout(clientProperties.apiCallAttemptTimeout())
                    .apiCallTimeout(clientProperties.apiCallTimeout())
                    .retryStrategy(retry -> retry.maxAttempts(clientProperties.maxAttempts())))
            .build();
    }
}
