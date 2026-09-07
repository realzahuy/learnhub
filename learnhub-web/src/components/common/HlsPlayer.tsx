import { type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState } from 'react';
import './HlsPlayer.css';
import { useHlsPlayback } from './useHlsPlayback';

interface HlsPlayerProps {

  playbackUrl: string;
  className?: string;

  onEnded?: () => void;
}

type SettingsView = 'main' | 'quality' | 'speed';

const AUTO_LEVEL = -1;
const CONTROLS_HIDE_DELAY_MS = 3000;
const PLAYBACK_RATES = [0.5, 1, 1.5, 2];

const formatTime = (seconds: number) => {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;
  const minuteText = minutes.toString().padStart(2, '0');
  const secondText = remainingSeconds.toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${minuteText}:${secondText}` : `${minuteText}:${secondText}`;
};

const HlsPlayer = ({ playbackUrl, className, onEnded }: HlsPlayerProps) => {
  const playerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const { hlsRef, playbackFailureRef, error, loading, setLoading, levels } = useHlsPlayback(playbackUrl, videoRef);
  const controlsTimeoutRef = useRef<number | undefined>(undefined);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [pictureInPicture, setPictureInPicture] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const [selectedLevel, setSelectedLevel] = useState(AUTO_LEVEL);

  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>('main');

  const showControls = () => {
    if (controlsTimeoutRef.current !== undefined) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    setControlsVisible(true);
    const controls = playerRef.current?.querySelector('.hls-controls');
    if (menuOpen || controls?.contains(document.activeElement) || controls?.querySelector('.hls-volume:hover')) return;
    controlsTimeoutRef.current = window.setTimeout(
      () => setControlsVisible(false),
      CONTROLS_HIDE_DELAY_MS
    );
  };

  const hideControls = () => {
    const controls = playerRef.current?.querySelector('.hls-controls');
    if (menuOpen || controls?.contains(document.activeElement)) return;
    if (controlsTimeoutRef.current !== undefined) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    setControlsVisible(false);
  };

  useEffect(() => {
    setHasStarted(false);
    if (!videoRef.current) return;
    setSelectedLevel(AUTO_LEVEL);
    setMenuOpen(false);
    setSettingsView('main');
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
    const handlePlay = () => {
      setHasStarted(true);
      setPlaying(true);
      playerRef.current?.focus({ preventScroll: true });
    };
    const handlePause = () => setPlaying(false);
    const handleEnterPictureInPicture = () => setPictureInPicture(true);
    const handleLeavePictureInPicture = () => setPictureInPicture(false);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('durationchange', updateDuration);
    video.addEventListener('volumechange', updateVolume);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('enterpictureinpicture', handleEnterPictureInPicture);
    video.addEventListener('leavepictureinpicture', handleLeavePictureInPicture);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('durationchange', updateDuration);
      video.removeEventListener('volumechange', updateVolume);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('enterpictureinpicture', handleEnterPictureInPicture);
      video.removeEventListener('leavepictureinpicture', handleLeavePictureInPicture);
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
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        setMenuOpen(false);
      }
    };

    document.addEventListener('click', close);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', onKeyDown, true);
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

  const seekBy = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
  };

  const handlePlayerKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !hasStarted || error) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;

    event.preventDefault();
    event.stopPropagation();
    showControls();

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      seekBy(event.key === 'ArrowLeft' ? -10 : 10);
    } else {
      const currentVolume = video.muted ? 0 : Math.round(video.volume * 100);
      const volumeChange = event.key === 'ArrowUp' ? 5 : -5;
      video.volume = Math.max(0, Math.min(100, currentVolume + volumeChange)) / 100;
      video.muted = false;
    }
  };

  const togglePictureInPicture = () => {
    const video = videoRef.current;
    if (!video || !document.pictureInPictureEnabled) return;
    if (document.pictureInPictureElement === video) void document.exitPictureInPicture();
    else void video.requestPictureInPicture();
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement === playerRef.current) void document.exitFullscreen();
    else if (playerRef.current) void playerRef.current.requestFullscreen();
  };

  const selectedQualityLabel =
    selectedLevel === AUTO_LEVEL
      ? 'Tự động'
      : levels.find((level) => level.index === selectedLevel)?.label ?? 'Tự động';
  const selectedSpeedLabel = playbackRate === 1 ? 'Chuẩn' : `${playbackRate}x`;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const progressStyle = {
    '--hls-progress-position': `${progressPercent}%`,
  } as CSSProperties;
  const volumeStyle = {
    '--hls-volume-position': `${(muted ? 0 : volume) * 100}%`,
  } as CSSProperties;

  return (
    <div
      ref={playerRef}
      className={`hls-player${!controlsVisible && playing ? ' is-controls-hidden' : ''}`}
      tabIndex={0}
      onKeyDownCapture={handlePlayerKeyDown}
      onPointerMove={showControls}
      onPointerDown={showControls}
      onMouseLeave={hideControls}
    >
      <video
        ref={videoRef}
        className={className}
        playsInline
        onClick={togglePlayback}
        onEnded={onEnded}
        onLoadStart={() => setLoading(true)}
        onWaiting={() => setLoading(true)}
        onSeeking={() => setLoading(true)}
        onSeeked={(event) => setLoading(
          event.currentTarget.readyState < HTMLMediaElement.HAVE_FUTURE_DATA
        )}
        onCanPlay={() => setLoading(false)}
        onPlaying={() => setLoading(false)}
        onError={() => playbackFailureRef.current?.()}
      />

      {loading && !error && (
        <div className="hls-loading" role="status" aria-label="Đang tải video">
          <span className="hls-loading-spinner" aria-hidden="true" />
        </div>
      )}

      {error && <div className="hls-player-error" role="alert">{error}</div>}

      {!hasStarted && !loading && !error && (
        <button
          type="button"
          className="hls-center-play"
          onClick={togglePlayback}
          aria-label="Phát video"
        >
          <svg viewBox="0 0 48 56" aria-hidden="true">
            <path d="M8 3 44 28 8 53Z" fill="currentColor" />
          </svg>
        </button>
      )}

      {!error && (
        <div
          className={`hls-controls${controlsVisible ? '' : ' is-hidden'}`}
          onClick={(event) => event.stopPropagation()}
          onFocus={showControls}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) showControls();
          }}
        >
          <input
            type="range"
            className="hls-progress"
            style={progressStyle}
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

          <div className="hls-controls-row">
            <div className="hls-controls-group">
              <button
                type="button"
                className="hls-control-button"
                onClick={togglePlayback}
                aria-label={playing ? 'Tạm dừng' : 'Phát'}
                title={playing ? 'Tạm dừng' : 'Phát'}
              >
                <i className={`bi ${playing ? 'bi-pause-fill' : 'bi-play-fill'}`}></i>
              </button>

              <button
                type="button"
                className="hls-control-button hls-skip-button"
                onClick={() => seekBy(-10)}
                aria-label="Lùi 10 giây"
                title="Lùi 10 giây"
              >
                <svg viewBox="0 0 28 28" aria-hidden="true">
                  <path d="M9 7H24V22H18" fill="none" stroke="currentColor" strokeWidth="2.5" />
                  <path d="M9 3 3 7 9 11Z" fill="currentColor" />
                  <text x="3" y="23">10</text>
                </svg>
              </button>

              <button
                type="button"
                className="hls-control-button hls-skip-button"
                onClick={() => seekBy(10)}
                aria-label="Tiến 10 giây"
                title="Tiến 10 giây"
              >
                <svg viewBox="0 0 28 28" aria-hidden="true">
                  <path d="M19 7H4V22H10" fill="none" stroke="currentColor" strokeWidth="2.5" />
                  <path d="M19 3 25 7 19 11Z" fill="currentColor" />
                  <text x="15" y="23">10</text>
                </svg>
              </button>

              <div className="hls-volume" onMouseLeave={showControls}>
                <button
                  type="button"
                  className={`hls-control-button${muted || volume === 0 ? ' is-muted' : ''}`}
                  onClick={toggleMuted}
                  aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                  title={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                >
                  <i className={`bi ${muted || volume === 0 ? 'bi-volume-mute-fill' : 'bi-volume-up-fill'}`}></i>
                </button>
                <div className="hls-volume-popup">
                  <input
                    type="range"
                    className="hls-volume-slider"
                    style={volumeStyle}
                    min="0"
                    max="1"
                    step="0.01"
                    value={muted ? 0 : volume}
                    onChange={(event) => {
                      const video = videoRef.current;
                      if (!video) return;
                      video.volume = Number(event.target.value);
                      video.muted = false;
                    }}
                    aria-label="Âm lượng"
                    aria-orientation="vertical"
                    aria-valuetext={`${Math.round((muted ? 0 : volume) * 100)}%`}
                  />
                </div>
              </div>

              <span className="hls-time">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="hls-controls-group hls-controls-group-right">
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
                  <i className="bi bi-gear"></i>
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
                onClick={togglePictureInPicture}
                disabled={!document.pictureInPictureEnabled}
                aria-label={pictureInPicture ? 'Thoát hình trong hình' : 'Hình trong hình'}
                title={pictureInPicture ? 'Thoát hình trong hình' : 'Hình trong hình'}
              >
                <svg className="hls-pip-icon" viewBox="0 0 28 28" aria-hidden="true">
                  <path d="M10 24H3V4H25V12M6 8 12 14M7 14H12V9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
                  <rect x="15" y="16" width="11" height="9" rx="0.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
                </svg>
              </button>

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
        </div>
      )}
    </div>
  );
};

export default HlsPlayer;
