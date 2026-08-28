import { useEffect, useRef, useState } from 'react';
import type Hls from 'hls.js';
import { resolveHlsUrl } from '../../config/runtimeConfig';
import { authenticatedFetch } from '../../services/api/config';
import './HlsPlayer.css';

interface HlsPlayerProps {

  playbackUrl: string;
  className?: string;

  onEnded?: () => void;
}

interface QualityLevel {

  index: number;
  label: string;
}

interface PlaybackSession {
  playbackUrl: string;
  expiresInSeconds: number;
}

type SettingsView = 'main' | 'quality' | 'speed';

const AUTO_LEVEL = -1;
const COOKIE_REFRESH_MARGIN_SECONDS = 60;
const CONTROLS_HIDE_DELAY_MS = 3000;
const PLAYBACK_RATES = [0.5, 1, 1.5, 2];

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const HlsPlayer = ({ playbackUrl, className, onEnded }: HlsPlayerProps) => {
  const playerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const hlsRef = useRef<Hls | null>(null);

  const [levels, setLevels] = useState<QualityLevel[]>([]);

  const [selectedLevel, setSelectedLevel] = useState(AUTO_LEVEL);

  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>('main');

  const showControls = () => {
    if (controlsTimeoutRef.current !== undefined) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    setControlsVisible(true);
    controlsTimeoutRef.current = window.setTimeout(
      () => setControlsVisible(false),
      CONTROLS_HIDE_DELAY_MS
    );
  };

  const hideControls = () => {
    if (menuOpen) return;
    if (controlsTimeoutRef.current !== undefined) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    setControlsVisible(false);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);
    setLevels([]);
    setSelectedLevel(AUTO_LEVEL);
    setMenuOpen(false);
    setSettingsView('main');

    let sessionUrl: string;
    try {
      sessionUrl = resolveHlsUrl(playbackUrl);
    } catch {
      setError('Không phát được video do cấu hình URL không hợp lệ.');
      return;
    }
    let cancelled = false;
    let hls: Hls | null = null;
    let usesNativePlayback = false;
    let refreshTimeout: number | undefined;

    const requestPlaybackSession = async (): Promise<PlaybackSession> => {
      const response = await authenticatedFetch(sessionUrl, { method: 'POST' });
      if (!response.ok) throw new Error('Không thể cấp quyền phát video');
      return response.json() as Promise<PlaybackSession>;
    };

    const scheduleCookieRefresh = (expiresInSeconds: number) => {
      refreshTimeout = window.setTimeout(() => {
        void requestPlaybackSession()
          .then((session) => {
            if (!cancelled) scheduleCookieRefresh(session.expiresInSeconds);
          })
          .catch(() => {
            if (!cancelled) setError('Không thể gia hạn quyền phát video. Vui lòng tải lại trang.');
          });
      }, (expiresInSeconds - COOKIE_REFRESH_MARGIN_SECONDS) * 1000);
    };

    const initializePlayer = async () => {
      try {
        const session = await requestPlaybackSession();
        if (cancelled) return;

        const url = resolveHlsUrl(session.playbackUrl);
        scheduleCookieRefresh(session.expiresInSeconds);

        const { default: Hls } = await import('hls.js');
        if (cancelled) return;

        if (!Hls.isSupported()) {
          if (video.canPlayType('application/vnd.apple.mpegurl')) {
            usesNativePlayback = true;
            video.crossOrigin = 'use-credentials';
            video.src = url;
            video.load();
            return;
          }

          setError('Trình duyệt này chưa phát được video. Hãy dùng Chrome, Edge hoặc Firefox.');
          return;
        }

        hls = new Hls({
          xhrSetup: (xhr) => {
            xhr.withCredentials = true;
          },
        });
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          if (cancelled) return;
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
          if (cancelled || !data.fatal) return;
          setError('Không phát được video. Vui lòng tải lại trang.');
        });

        hls.loadSource(url);
        hls.attachMedia(video);
      } catch {
        if (cancelled) return;
        setError('Không phát được video. Vui lòng tải lại trang.');
      }
    };

    void initializePlayer();

    return () => {
      cancelled = true;
      if (refreshTimeout !== undefined) window.clearTimeout(refreshTimeout);
      hls?.destroy();
      if (hlsRef.current === hls) hlsRef.current = null;

      if (usesNativePlayback) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [playbackUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    const updateVolume = () => {
      setVolume(video.volume);
      setMuted(video.muted);
    };
    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('durationchange', updateDuration);
    video.addEventListener('volumechange', updateVolume);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('durationchange', updateDuration);
      video.removeEventListener('volumechange', updateVolume);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(document.fullscreenElement === playerRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      if (controlsTimeoutRef.current !== undefined) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
      setControlsVisible(true);
      return;
    }

    showControls();
    return () => {
      if (controlsTimeoutRef.current !== undefined) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    const close = () => setMenuOpen(false);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('click', close);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const changeLevel = (index: number) => {
    setSelectedLevel(index);
    setMenuOpen(false);
    setSettingsView('main');
    if (hlsRef.current) hlsRef.current.nextLevel = index;
  };

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    showControls();
    if (video.paused) void video.play();
    else video.pause();
  };

  const changePlaybackRate = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
    setMenuOpen(false);
    setSettingsView('main');
  };

  const toggleSettingsMenu = () => {
    setSettingsView('main');
    setMenuOpen((open) => !open);
  };

  const toggleMuted = () => {
    const video = videoRef.current;
    if (video) video.muted = !video.muted;
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement === playerRef.current) void document.exitFullscreen();
    else if (playerRef.current) void playerRef.current.requestFullscreen();
  };

  if (error) {
    return <div className="hls-player-error">{error}</div>;
  }

  const selectedQualityLabel =
    selectedLevel === AUTO_LEVEL
      ? 'Tự động'
      : levels.find((level) => level.index === selectedLevel)?.label ?? 'Tự động';
  const selectedSpeedLabel = playbackRate === 1 ? 'Chuẩn' : `${playbackRate}x`;

  return (
    <div
      ref={playerRef}
      className={`hls-player${controlsVisible ? '' : ' is-controls-hidden'}`}
      onPointerMove={showControls}
      onPointerDown={showControls}
      onMouseLeave={hideControls}
    >
      <video
        ref={videoRef}
        className={className}
        disablePictureInPicture
        playsInline
        onClick={togglePlayback}
        onEnded={onEnded}
      />

      <div
        className={`hls-controls${controlsVisible ? '' : ' is-hidden'}`}
        onClick={(event) => event.stopPropagation()}
        onFocus={showControls}
      >
        <button
          type="button"
          className="hls-control-button"
          onClick={togglePlayback}
          aria-label={playing ? 'Tạm dừng' : 'Phát'}
          title={playing ? 'Tạm dừng' : 'Phát'}
        >
          <i className={`bi ${playing ? 'bi-pause-fill' : 'bi-play-fill'}`}></i>
        </button>

        <span className="hls-time">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <input
          type="range"
          className="hls-progress"
          min="0"
          max={duration || 0}
          step="0.1"
          value={Math.min(currentTime, duration || 0)}
          onChange={(event) => {
            const video = videoRef.current;
            if (video) video.currentTime = Number(event.target.value);
          }}
          aria-label="Tua video"
        />

        <button
          type="button"
          className="hls-control-button"
          onClick={toggleMuted}
          aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          title={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
        >
          <i className={`bi ${muted || volume === 0 ? 'bi-volume-mute-fill' : 'bi-volume-up-fill'}`}></i>
        </button>

        <input
          type="range"
          className="hls-volume"
          min="0"
          max="1"
          step="0.05"
          value={muted ? 0 : volume}
          onChange={(event) => {
            const video = videoRef.current;
            if (!video) return;
            video.volume = Number(event.target.value);
            video.muted = false;
          }}
          aria-label="Âm lượng"
        />

        <div className="hls-settings" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="hls-control-button"
            onClick={toggleSettingsMenu}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            aria-label="Cài đặt video"
            title="Cài đặt video"
          >
            <i className="bi bi-gear-fill"></i>
          </button>

          {menuOpen && (
            <div className="hls-settings-menu">
              {settingsView === 'main' && (
                <>
                  <button
                    type="button"
                    className="hls-settings-entry"
                    onClick={() => setSettingsView('quality')}
                  >
                    <span>Chất lượng</span>
                    <span className="hls-settings-value">
                      {selectedQualityLabel}
                      <i className="bi bi-chevron-right"></i>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="hls-settings-entry"
                    onClick={() => setSettingsView('speed')}
                  >
                    <span>Tốc độ phát</span>
                    <span className="hls-settings-value">
                      {selectedSpeedLabel}
                      <i className="bi bi-chevron-right"></i>
                    </span>
                  </button>
                </>
              )}

              {settingsView === 'quality' && (
                <div>
                  <button
                    type="button"
                    className="hls-settings-header"
                    onClick={() => setSettingsView('main')}
                  >
                    <i className="bi bi-chevron-left"></i>
                    Chất lượng
                  </button>

                  {levels.map((level) => (
                    <button
                      key={level.index}
                      type="button"
                      className={`hls-settings-option${
                        selectedLevel === level.index ? ' is-active' : ''
                      }`}
                      onClick={() => changeLevel(level.index)}
                    >
                      <span className="hls-settings-check">
                        {selectedLevel === level.index && <i className="bi bi-check-lg"></i>}
                      </span>
                      {level.label}
                    </button>
                  ))}

                  <button
                    type="button"
                    className={`hls-settings-option${
                      selectedLevel === AUTO_LEVEL ? ' is-active' : ''
                    }`}
                    onClick={() => changeLevel(AUTO_LEVEL)}
                  >
                    <span className="hls-settings-check">
                      {selectedLevel === AUTO_LEVEL && <i className="bi bi-check-lg"></i>}
                    </span>
                    Tự động
                  </button>
                </div>
              )}

              {settingsView === 'speed' && (
                <div>
                  <button
                    type="button"
                    className="hls-settings-header"
                    onClick={() => setSettingsView('main')}
                  >
                    <i className="bi bi-chevron-left"></i>
                    Tốc độ phát
                  </button>

                  {PLAYBACK_RATES.map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      className={`hls-settings-option${playbackRate === rate ? ' is-active' : ''}`}
                      onClick={() => changePlaybackRate(rate)}
                    >
                      <span className="hls-settings-check">
                        {playbackRate === rate && <i className="bi bi-check-lg"></i>}
                      </span>
                      {rate === 1 ? 'Chuẩn' : `${rate}x`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          className="hls-control-button"
          onClick={toggleFullscreen}
          aria-label={fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
          title={fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
        >
          <i className={`bi ${fullscreen ? 'bi-fullscreen-exit' : 'bi-fullscreen'}`}></i>
        </button>
      </div>
    </div>
  );
};

export default HlsPlayer;
