package com.zh.learnhub_api.services.media;

import com.zh.learnhub_api.enums.VideoStatus;
import com.zh.learnhub_api.pojo.Video;

public final class VideoPlaybackUrls {

    private static final String AUTHENTICATED_PREFIX = "/api/learn/videos/";
    private static final String PREVIEW_PREFIX = "/api/learn/preview/videos/";
    private static final String INSTRUCTOR_PREFIX = "/api/instructor/videos/";

    private VideoPlaybackUrls() {}

    public static String authenticated(Video video) {
        return build(video, AUTHENTICATED_PREFIX);
    }

    public static String preview(Video video) {
        return build(video, PREVIEW_PREFIX);
    }

    public static String instructor(Video video) {
        return build(video, INSTRUCTOR_PREFIX);
    }

    private static String build(Video video, String prefix) {
        String storageKey = video.getStorageKey();
        if (video.getStatus() != VideoStatus.READY || storageKey == null || storageKey.isBlank()) {
            return null;
        }

        return prefix + video.getId() + "/playback-session";
    }
}
