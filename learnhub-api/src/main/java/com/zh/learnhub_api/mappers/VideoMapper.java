package com.zh.learnhub_api.mappers;

import com.zh.learnhub_api.dtos.media.VideoResponseDTO;
import com.zh.learnhub_api.pojo.Video;
import com.zh.learnhub_api.services.media.VideoPlaybackUrls;

public final class VideoMapper {

    private VideoMapper() {}

    public static VideoResponseDTO toDTO(Video video) {
        return VideoResponseDTO.builder()
                .id(video.getId())
                .title(video.getTitle())
                .status(video.getStatus())
                .position(video.getPosition())
                .durationSeconds(video.getDurationSeconds())
                .playbackUrl(VideoPlaybackUrls.instructor(video))
                .build();
    }
}
