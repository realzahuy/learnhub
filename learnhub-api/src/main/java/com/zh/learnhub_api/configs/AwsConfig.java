package com.zh.learnhub_api.configs;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import io.awspring.cloud.sqs.config.SqsMessageListenerContainerFactory;
import io.awspring.cloud.sqs.listener.acknowledgement.handler.AcknowledgementMode;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.regions.providers.AwsRegionProvider;
import software.amazon.awssdk.services.sqs.SqsAsyncClient;

import java.time.Duration;

@Configuration
@ConditionalOnProperty(name = "video.storage.provider", havingValue = "s3")
public class AwsConfig {

    @Bean
    public AwsCredentialsProvider awsCredentialsProvider(
            AppProperties.AwsS3 properties) {
        return StaticCredentialsProvider.create(
                AwsBasicCredentials.create(properties.accessKey(), properties.secretKey()));
    }

    @Bean
    public AwsRegionProvider awsRegionProvider(AppProperties.AwsS3 properties) {
        Region configuredRegion = Region.of(properties.region());
        return () -> configuredRegion;
    }

    @Bean("videoJobSqsListenerContainerFactory")
    public SqsMessageListenerContainerFactory<Object> videoJobSqsListenerContainerFactory(
            SqsAsyncClient sqsAsyncClient,
            AppProperties.AwsSqsListener listenerProperties) {
        return SqsMessageListenerContainerFactory.builder()
                .sqsAsyncClient(sqsAsyncClient)
                .configure(options -> options
                        .autoStartup(listenerProperties.autoStartup())
                        .maxConcurrentMessages(1)
                        .maxMessagesPerPoll(1)
                        .pollTimeout(Duration.ofSeconds(20))
                        .acknowledgementMode(AcknowledgementMode.ON_SUCCESS))
                .build();
    }
}
