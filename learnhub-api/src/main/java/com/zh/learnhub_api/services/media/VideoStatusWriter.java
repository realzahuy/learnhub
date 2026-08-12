package com.zh.learnhub_api.services.media;

import com.zh.learnhub_api.exceptions.ResourceNotFoundException;
import com.zh.learnhub_api.pojo.Video;
import com.zh.learnhub_api.repositories.media.VideoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class VideoStatusWriter {

    private final VideoRepository videoRepository;
    private final VideoLifecycle videoLifecycle;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(Long videoId) {
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Video not found with id: " + videoId));

        if (videoLifecycle.isFailed(video)) {
            log.debug("Video {} đã ở trạng thái FAILED", videoId);
            return;
        }

        videoLifecycle.markFailed(video, LocalDateTime.now());
        videoRepository.save(video);
        log.warn("Video {} status updated to FAILED", videoId);
    }
}
