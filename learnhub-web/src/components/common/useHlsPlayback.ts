import { useEffect, useRef, useState, type RefObject } from 'react';
import type Hls from 'hls.js';
import { resolveHlsUrl } from '../../config/runtimeConfig';
import { authenticatedFetch } from '../../services/api/config';

interface QualityLevel {

  index: number;
  label: string;
}

interface PlaybackSession {
  playbackUrl: string;
  expiresInSeconds: number;
}

const COOKIE_REFRESH_MARGIN_SECONDS = 60;

export const useHlsPlayback = (playbackUrl: string, videoRef: RefObject<HTMLVideoElement | null>) => {
  const hlsRef = useRef<Hls | null>(null);
  const playbackFailureRef = useRef<(() => void) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [levels, setLevels] = useState<QualityLevel[]>([]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);
    setLoading(true);
    setLevels([]);

    let disposed = false;
    let playbackStopped = false;
    let hls: Hls | null = null;
    let usesNativePlayback = false;
    let refreshTimeout: number | undefined;
    const sessionController = new AbortController();

    const stopPlayback = () => {
      if (playbackStopped) return;
      playbackStopped = true;
      sessionController.abort();
      video.pause();
      if (refreshTimeout !== undefined) {
        window.clearTimeout(refreshTimeout);
        refreshTimeout = undefined;
      }
      hls?.destroy();
      if (hlsRef.current === hls) hlsRef.current = null;
      hls = null;

      if (usesNativePlayback) {
        video.pause();
        video.removeAttribute('src');
        video.load();
        usesNativePlayback = false;
      }
    };

    const failPlayback = (message: string) => {
      if (disposed || playbackStopped) return;
      stopPlayback();
      setLoading(false);
      setError(message);
    };

    playbackFailureRef.current = () => {
      failPlayback('Không phát được video. Vui lòng tải lại trang.');
    };

    let sessionUrl: string;
    try {
      sessionUrl = resolveHlsUrl(playbackUrl);
    } catch {
      failPlayback('Không phát được video do cấu hình URL không hợp lệ.');
      return () => {
        disposed = true;
        stopPlayback();
        playbackFailureRef.current = null;
      };
    }

    const requestPlaybackSession = async (): Promise<PlaybackSession> => {
      const response = await authenticatedFetch(sessionUrl, {
        method: 'POST',
        signal: sessionController.signal,
      });
      if (!response.ok) throw new Error('Không thể cấp quyền phát video');
      return response.json() as Promise<PlaybackSession>;
    };

    const scheduleCookieRefresh = (expiresInSeconds: number) => {
      const refreshMarginSeconds = Math.min(
        COOKIE_REFRESH_MARGIN_SECONDS,
        expiresInSeconds / 2
      );
      refreshTimeout = window.setTimeout(() => {
        void requestPlaybackSession()
          .then((session) => {
            if (!disposed && !playbackStopped) scheduleCookieRefresh(session.expiresInSeconds);
          })
          .catch(() => {
            failPlayback('Không thể gia hạn quyền phát video. Vui lòng tải lại trang.');
          });
      }, (expiresInSeconds - refreshMarginSeconds) * 1000);
    };

    const initializePlayer = async () => {
      try {
        const session = await requestPlaybackSession();
        if (disposed || playbackStopped) return;

        const url = resolveHlsUrl(session.playbackUrl);
        scheduleCookieRefresh(session.expiresInSeconds);

        const { default: Hls } = await import('hls.js');
        if (disposed || playbackStopped) return;

        if (!Hls.isSupported()) {
          if (video.canPlayType('application/vnd.apple.mpegurl')) {
            usesNativePlayback = true;
            video.crossOrigin = 'use-credentials';
            video.src = url;
            video.load();
            return;
          }

          failPlayback('Trình duyệt này chưa phát được video. Hãy dùng Chrome, Edge hoặc Firefox.');
          return;
        }

        hls = new Hls({
          xhrSetup: (xhr) => {
            xhr.withCredentials = true;
          },
        });
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          if (disposed || playbackStopped) return;
          setLevels(
            data.levels
              .map((level, index) => ({
                index,
                label: level.height ? `${level.height}p` : `${Math.round(level.bitrate / 1000)} kbps`,
              }))

              .sort((a, b) => (data.levels[b.index].height ?? 0) - (data.levels[a.index].height ?? 0))
          );
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (disposed || playbackStopped || !data.fatal) return;
          failPlayback('Không phát được video. Vui lòng tải lại trang.');
        });

        hls.loadSource(url);
        hls.attachMedia(video);
      } catch {
        failPlayback('Không phát được video. Vui lòng tải lại trang.');
      }
    };

    void initializePlayer();

    return () => {
      disposed = true;
      stopPlayback();
      playbackFailureRef.current = null;
    };
  }, [playbackUrl, videoRef]);

  return { hlsRef, playbackFailureRef, error, loading, setLoading, levels };
};
