import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { uiConfig } from '../config/uiConfig';
import { videoService, VideoProgressEvent } from '../services/api/video.service';
import { Video } from '../types/lesson.types';

type VideosByLesson = Record<number, Video[]>;
type RefreshStatuses = (videoIds: number[], queueWhenBusy?: boolean) => Promise<boolean>;

export const useVideoProgress = (
  courseId: number | null,
  videosByLesson: VideosByLesson,
  setVideosByLesson: Dispatch<SetStateAction<VideosByLesson>>
) => {
  const [progressByVideoId, setProgressByVideoId] = useState<Record<number, number>>({});
  const refreshingIdsRef = useRef(new Set<number>());
  const queuedRefreshIdsRef = useRef(new Set<number>());
  const refreshStatusesRef = useRef<RefreshStatuses | null>(null);

  const trackedKey = useMemo(
    () =>
      Object.values(videosByLesson)
        .flat()
        .filter((video) => video.status === 'UPLOADING' || video.status === 'PROCESSING')
        .map((video) => `${video.id}:${video.status}`)
        .sort()
        .join(','),
    [videosByLesson]
  );
  const trackedIds = useMemo(
    () => trackedKey
      ? trackedKey.split(',').map((entry) => Number(entry.split(':')[0]))
      : [],
    [trackedKey]
  );
  const uploadingIds = useMemo(
    () => new Set(
      trackedKey
        .split(',')
        .filter((entry) => entry.endsWith(':UPLOADING'))
        .map((entry) => Number(entry.split(':')[0]))
    ),
    [trackedKey]
  );

  useEffect(() => {
    setProgressByVideoId((previous) => {
      const previousIds = Object.keys(previous);
      if (previousIds.length === trackedIds.length
          && trackedIds.every((id) => Object.prototype.hasOwnProperty.call(previous, id))) {
        return previous;
      }

      const next: Record<number, number> = {};
      trackedIds.forEach((id) => {
        next[id] = previous[id] ?? 0;
      });
      return next;
    });
  }, [trackedKey, trackedIds]);

  useEffect(() => {
    if (!courseId || trackedIds.length === 0) return;

    let stopped = false;
    let reconnectDelay: number = uiConfig.video.sseReconnectInitialMs;
    let reconnectTimer: number | undefined;
    let progressTimer: number | undefined;
    const controller = new AbortController();
    const trackedSet = new Set(trackedIds);
    const pendingProgress = new Map<number, number>();
    const refreshingIds = refreshingIdsRef.current;
    const queuedRefreshIds = queuedRefreshIdsRef.current;
    const uploadingRefreshRequested = new Set<number>();

    const refreshStatuses = async (
      videoIds: number[],
      queueWhenBusy = false
    ): Promise<boolean> => {
      const refreshIds: number[] = [];
      [...new Set(videoIds)].forEach((videoId) => {
        if (!trackedSet.has(videoId)) return;
        if (refreshingIds.has(videoId)) {
          if (queueWhenBusy) queuedRefreshIds.add(videoId);
          return;
        }
        refreshingIds.add(videoId);
        refreshIds.push(videoId);
      });

      if (refreshIds.length === 0) return true;

      let succeeded = false;
      try {
        const freshVideos = await videoService.getStatuses(courseId, refreshIds);
        if (stopped) return true;

        const freshById = new Map(freshVideos.map((video) => [video.id, video]));
        setVideosByLesson((previous) => {
          let next = previous;

          Object.entries(previous).forEach(([lessonId, videos]) => {
            let nextVideos = videos;
            videos.forEach((video, index) => {
              const fresh = freshById.get(video.id);
              if (!fresh || fresh.status === video.status) return;

              if (nextVideos === videos) nextVideos = [...videos];
              nextVideos[index] = fresh;
            });

            if (nextVideos !== videos) {
              if (next === previous) next = { ...previous };
              next[Number(lessonId)] = nextVideos;
            }
          });

          return next;
        });
        succeeded = true;
      } catch (error) {
        if (!stopped) console.error('Không thể làm mới trạng thái video:', error);
      } finally {
        const rerunIds: number[] = [];
        refreshIds.forEach((videoId) => {
          refreshingIds.delete(videoId);
          if (queuedRefreshIds.has(videoId)) rerunIds.push(videoId);
        });

        const latestRefresh = refreshStatusesRef.current;
        if (latestRefresh && rerunIds.length > 0) {
          rerunIds.forEach((videoId) => queuedRefreshIds.delete(videoId));
          void latestRefresh(rerunIds, true);
        }
      }

      return succeeded;
    };

    refreshStatusesRef.current = refreshStatuses;
    const queuedForCurrentEffect: number[] = [];
    [...queuedRefreshIds].forEach((videoId) => {
      queuedRefreshIds.delete(videoId);
      if (trackedSet.has(videoId)) queuedForCurrentEffect.push(videoId);
    });
    if (queuedForCurrentEffect.length > 0) {
      void refreshStatuses(queuedForCurrentEffect, true);
    }

    const flushProgress = () => {
      progressTimer = undefined;
      if (stopped || pendingProgress.size === 0) return;

      const updates = [...pendingProgress];
      pendingProgress.clear();
      setProgressByVideoId((previous) => {
        let next = previous;

        updates.forEach(([videoId, progress]) => {
          const current = previous[videoId] ?? 0;
          if (progress <= current) return;
          if (next === previous) next = { ...previous };
          next[videoId] = progress;
        });

        return next;
      });
    };

    const queueProgress = (videoId: number, progress: number, immediate: boolean) => {
      pendingProgress.set(videoId, Math.max(pendingProgress.get(videoId) ?? 0, progress));

      if (immediate) {
        if (progressTimer !== undefined) window.clearTimeout(progressTimer);
        flushProgress();
      } else if (progressTimer === undefined) {
        progressTimer = window.setTimeout(flushProgress, uiConfig.video.progressFlushMs);
      }
    };

    const handleProgress = (event: VideoProgressEvent) => {
      if (!trackedSet.has(event.videoId)) return;

      const progress = Number.isFinite(event.progress)
        ? Math.max(0, Math.min(100, event.progress))
        : 0;
      const terminal = event.status === 'READY' || event.status === 'FAILED';
      queueProgress(event.videoId, progress, terminal);

      if (terminal) {
        void refreshStatuses([event.videoId], true);
      } else if (uploadingIds.has(event.videoId)
          && !uploadingRefreshRequested.has(event.videoId)) {
        uploadingRefreshRequested.add(event.videoId);
        void refreshStatuses([event.videoId], true).then((succeeded) => {
          if (!succeeded) uploadingRefreshRequested.delete(event.videoId);
        });
      }
    };

    const connect = async () => {
      try {
        await videoService.streamProgress(courseId, handleProgress, controller.signal);
        reconnectDelay = uiConfig.video.sseReconnectInitialMs;
      } catch (error) {
        if (controller.signal.aborted || stopped) return;
        console.warn('Kết nối SSE theo dõi tiến độ video bị gián đoạn; đang kết nối lại:', error);
      }

      if (stopped) return;
      reconnectTimer = window.setTimeout(() => {
        reconnectDelay = Math.min(reconnectDelay * 2, uiConfig.video.sseReconnectMaxMs);
        void connect();
      }, reconnectDelay);
    };

    void connect();
    const fallbackTimer = window.setInterval(
      () => void refreshStatuses(trackedIds),
      uiConfig.video.statusPollMs
    );

    return () => {
      stopped = true;
      controller.abort();
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      if (progressTimer !== undefined) window.clearTimeout(progressTimer);
      window.clearInterval(fallbackTimer);
      if (refreshStatusesRef.current === refreshStatuses) refreshStatusesRef.current = null;
    };
  }, [courseId, trackedIds, uploadingIds, setVideosByLesson]);

  return progressByVideoId;
};
