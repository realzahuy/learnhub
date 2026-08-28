package com.zh.learnhub_api.dtos.media;

public record VideoPlaybackSessionDTO(
        String playbackUrl,
        long expiresInSeconds) {
}
