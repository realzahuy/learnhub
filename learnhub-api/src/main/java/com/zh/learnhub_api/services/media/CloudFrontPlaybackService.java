package com.zh.learnhub_api.services.media;

import com.zh.learnhub_api.configs.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.cloudfront.CloudFrontUtilities;
import software.amazon.awssdk.services.cloudfront.cookie.CookiesForCustomPolicy;
import software.amazon.awssdk.services.cloudfront.model.CustomSignerRequest;

import java.nio.file.Path;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CloudFrontPlaybackService {

    private static final CloudFrontUtilities CLOUD_FRONT_UTILITIES = CloudFrontUtilities.create();

    private final AppProperties.AwsCloudFront properties;

    public PlaybackSession createSession(String masterKey) throws Exception {
        String playbackPath = "/" + masterKey;
        String folderPath = playbackPath.substring(0, playbackPath.lastIndexOf('/') + 1);
        Instant expiration = Instant.now().plusSeconds(properties.cookieExpiration());

        CustomSignerRequest signerRequest = CustomSignerRequest.builder()
                .resourceUrl(properties.baseUrl() + playbackPath)
                .resourceUrlPattern(properties.baseUrl() + folderPath + "*")
                .privateKey(Path.of(properties.privateKeyPath()))
                .keyPairId(properties.keyPairId())
                .expirationDate(expiration)
                .build();

        CookiesForCustomPolicy cookies = CLOUD_FRONT_UTILITIES.getCookiesForCustomPolicy(signerRequest);
        String attributes = "; Path=" + folderPath
                + "; Max-Age=" + properties.cookieExpiration()
                + "; Secure; HttpOnly; SameSite=None; Partitioned";

        return new PlaybackSession(
                playbackPath,
                properties.cookieExpiration(),
                List.of(
                        cookies.policyHeaderValue() + attributes,
                        cookies.signatureHeaderValue() + attributes,
                        cookies.keyPairIdHeaderValue() + attributes));
    }

    public record PlaybackSession(
            String playbackUrl,
            long expiresInSeconds,
            List<String> setCookieHeaders) {
    }
}
