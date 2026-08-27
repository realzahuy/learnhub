package com.zh.learnhub_api.configs;

import io.awspring.cloud.autoconfigure.s3.S3ClientCustomizer;
import io.awspring.cloud.autoconfigure.sqs.SqsAsyncClientCustomizer;
import io.awspring.cloud.sqs.config.SqsMessageListenerContainerFactory;
import io.awspring.cloud.sqs.listener.acknowledgement.handler.AcknowledgementMode;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.http.apache5.Apache5HttpClient;
import software.amazon.awssdk.http.nio.netty.NettyNioAsyncHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.regions.providers.AwsRegionProvider;
import software.amazon.awssdk.services.mediaconvert.MediaConvertClient;
import software.amazon.awssdk.services.sqs.SqsAsyncClient;

@Configuration
@ConditionalOnProperty(name = "video.storage.provider", havingValue = "s3")
public class AwsConfig {

    @Bean
    public AwsCredentialsProvider awsCredentialsProvider(AppProperties.AwsS3 properties) {
        return StaticCredentialsProvider.create(
                AwsBasicCredentials.create(properties.accessKey(), properties.secretKey()));
    }

    @Bean
    public AwsRegionProvider awsRegionProvider(AppProperties.AwsS3 properties) {
        Region configuredRegion = Region.of(properties.region());
        return () -> configuredRegion;
    }

    @Bean
    public MediaConvertClient mediaConvertClient(
            AwsCredentialsProvider credentialsProvider,
            AwsRegionProvider regionProvider,
            AppProperties.AwsClient clientProperties) {
        return MediaConvertClient.builder()
                .region(regionProvider.getRegion())
                .credentialsProvider(credentialsProvider)
                .httpClientBuilder(Apache5HttpClient.builder().connectionTimeout(clientProperties.connectionTimeout()))
                .overrideConfiguration(
                        override -> override.apiCallAttemptTimeout(clientProperties.apiCallAttemptTimeout())
                                .apiCallTimeout(clientProperties.apiCallTimeout())
                                .retryStrategy(retry -> retry.maxAttempts(clientProperties.maxAttempts())))
                .build();
    }

    @Bean
    public S3ClientCustomizer s3ClientCustomizer(AppProperties.AwsClient properties) {
        return builder -> {
            builder.httpClientBuilder(Apache5HttpClient.builder().connectionTimeout(properties.connectionTimeout()));
            builder.overrideConfiguration(builder.overrideConfiguration()
                    .copy(override -> override.apiCallAttemptTimeout(properties.apiCallAttemptTimeout())
                            .apiCallTimeout(properties.apiCallTimeout())
                            .retryStrategy(retry -> retry.maxAttempts(properties.maxAttempts()))));
        };
    }

    @Bean
    public SqsAsyncClientCustomizer sqsAsyncClientCustomizer(AppProperties.AwsClient properties) {
        return builder -> {
            builder.httpClientBuilder(
                    NettyNioAsyncHttpClient.builder().connectionTimeout(properties.connectionTimeout()));
            builder.overrideConfiguration(builder.overrideConfiguration()
                    .copy(override -> override.apiCallAttemptTimeout(properties.apiCallAttemptTimeout())
                            .apiCallTimeout(properties.apiCallTimeout())
                            .retryStrategy(retry -> retry.maxAttempts(properties.maxAttempts()))));
        };
    }

    @Bean("videoJobSqsListenerContainerFactory")
    public SqsMessageListenerContainerFactory<Object> videoJobSqsListenerContainerFactory(
            SqsAsyncClient sqsAsyncClient,
            AppProperties.AwsSqsListener listenerProperties,
            AppProperties.AwsClient clientProperties) {
        if (clientProperties.apiCallAttemptTimeout().compareTo(listenerProperties.pollTimeout()) <= 0) {
            throw new IllegalStateException("Thời gian chờ AWS không hợp lệ");
        }
        return SqsMessageListenerContainerFactory.builder()
                .sqsAsyncClient(sqsAsyncClient)
                .configure(options -> options.autoStartup(listenerProperties.autoStartup())
                        .maxConcurrentMessages(listenerProperties.maxConcurrentMessages())
                        .maxMessagesPerPoll(listenerProperties.maxMessagesPerPoll())
                        .pollTimeout(listenerProperties.pollTimeout())
                        .acknowledgementMode(AcknowledgementMode.ON_SUCCESS))
                .build();
    }
}
