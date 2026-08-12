import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import { videoService, VideoProgressEvent } from '../services/api/video.service';
import { Video } from '../types/lesson.types';

const FALLBACK_POLL_MS = 30_000;
const INITIAL_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 15_000;

type VideosByLesson = Record<number, Video[]>;

export const useVideoProgress = (
  courseId: number | null,
  videosByLesson: VideosByLesson,
  setVideosByLesson: Dispatch<SetStateAction<VideosByLesson>>
) => {
  const [progressByVideoId, setProgressByVideoId] = useState<Record<number, number>>({});

  const processingKey = useMemo(
    () =>
      Object.values(videosByLesson)
        .flat()
        .filter((video) => video.status === 'PROCESSING')
        .map((video) => video.id)
        .sort((a, b) => a - b)
        .join(','),
    [videosByLesson]
  );
  const processingIds = useMemo(
    () => processingKey ? processingKey.split(',').map(Number) : [],
    [processingKey]
  );

  useEffect(() => {
    setProgressByVideoId((previous) => {
      const next: Record<number, number> = {};
      processingIds.forEach((id) => {
        next[id] = previous[id] ?? 0;
      });
      return next;
    });
  }, [processingKey, processingIds]);

  useEffect(() => {
    if (!courseId || processingIds.length === 0) return;

    let stopped = false;
    let reconnectDelay = INITIAL_RECONNECT_MS;
    let reconnectTimer: number | undefined;
    const controller = new AbortController();
    const processingSet = new Set(processingIds);

    const refreshStatuses = async (videoIds: number[]) => {
      try {
        const freshVideos = await videoService.getStatuses(courseId, videoIds);
        if (stopped) return;

        const freshById = new Map(freshVideos.map((video) => [video.id, video]));
        setVideosByLesson((previous) => {
          let changed = false;
          const next = Object.fromEntries(
            Object.entries(previous).map(([lessonId, videos]) => [
              lessonId,
              videos.map((video) => {
                const fresh = freshById.get(video.id);
                if (!fresh || fresh.status === video.status) return video;
                changed = true;
                return fresh;
              }),
            ])
          ) as VideosByLesson;
          return changed ? next : previous;
        });
      } catch (error) {
        if (!stopped) console.error('Không thể làm mới trạng thái video:', error);
      }
    };

    const handleProgress = (event: VideoProgressEvent) => {
      if (!processingSet.has(event.videoId)) return;

      const progress = Math.max(0, Math.min(100, event.progress));
      setProgressByVideoId((previous) => ({
        ...previous,
        [event.videoId]: Math.max(previous[event.videoId] ?? 0, progress),
      }));

      if (event.status === 'READY' || event.status === 'FAILED') {
        void refreshStatuses([event.videoId]);
      }
    };

    const connect = async () => {
      try {
        await videoService.streamProgress(courseId, handleProgress, controller.signal);
        reconnectDelay = INITIAL_RECONNECT_MS;
      } catch (error) {
        if (controller.signal.aborted || stopped) return;
        console.warn('Kết nối SSE theo dõi tiến độ video bị gián đoạn; đang kết nối lại:', error);
      }

      if (stopped) return;
      reconnectTimer = window.setTimeout(() => {
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_MS);
        void connect();
      }, reconnectDelay);
    };

    void connect();
    const fallbackTimer = window.setInterval(
      () => void refreshStatuses(processingIds),
      FALLBACK_POLL_MS
    );

    return () => {
      stopped = true;
      controller.abort();
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      window.clearInterval(fallbackTimer);
    };
  }, [courseId, processingIds, setVideosByLesson]);

  return progressByVideoId;
};
