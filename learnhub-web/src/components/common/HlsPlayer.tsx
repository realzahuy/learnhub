import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { getAccessToken } from '../../services/api/tokenStore';
import './HlsPlayer.css';

interface HlsPlayerProps {

  playbackUrl: string;
  className?: string;

  onEnded?: () => void;

  onWatched?: () => void;
}

interface QualityLevel {

  index: number;
  label: string;
}

const AUTO_LEVEL = -1;

const WATCHED_RATIO = 0.9;

const API_ORIGIN = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'
).replace(/\/api\/?$/, '');

const HlsPlayer = ({ playbackUrl, className, onEnded, onWatched }: HlsPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  const hlsRef = useRef<Hls | null>(null);

  const [levels, setLevels] = useState<QualityLevel[]>([]);

  const [selectedLevel, setSelectedLevel] = useState(AUTO_LEVEL);

  const [activeLevel, setActiveLevel] = useState(AUTO_LEVEL);
  const [menuOpen, setMenuOpen] = useState(false);

  const watchedRef = useRef(false);

  const onWatchedRef = useRef(onWatched);
  useEffect(() => {
    onWatchedRef.current = onWatched;
  }, [onWatched]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    watchedRef.current = false;

    setLevels([]);
    setSelectedLevel(AUTO_LEVEL);
    setActiveLevel(AUTO_LEVEL);
    setMenuOpen(false);

    const url = `${API_ORIGIN}${playbackUrl}`;
    const token = getAccessToken();

    if (!Hls.isSupported()) {

      setError('Trình duyệt này chưa phát được video. Hãy dùng Chrome, Edge hoặc Firefox.');
      return;
    }

    const hls = new Hls({
      xhrSetup: (xhr) => {
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      },
    });
    hlsRef.current = hls;

    hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
      setLevels(
        data.levels
          .map((level, index) => ({
            index,
            label: level.height ? `${level.height}p` : `${Math.round(level.bitrate / 1000)} kbps`,
          }))

          .sort((a, b) => (data.levels[b.index].height ?? 0) - (data.levels[a.index].height ?? 0))
      );
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
      setActiveLevel(data.level);
    });

    hls.on(Hls.Events.ERROR, (_event, data) => {

      if (!data.fatal) return;
      console.error('Lỗi HLS:', data);
      setError('Không phát được video. Vui lòng tải lại trang.');
    });

    hls.loadSource(url);
    hls.attachMedia(video);

    const handleTimeUpdate = () => {
      if (watchedRef.current || !video.duration || Number.isNaN(video.duration)) return;
      if (video.currentTime / video.duration < WATCHED_RATIO) return;

      watchedRef.current = true;
      onWatchedRef.current?.();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      hls.destroy();
      hlsRef.current = null;
    };
  }, [playbackUrl]);

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
    if (hlsRef.current) hlsRef.current.nextLevel = index;
  };

  if (error) {
    return <div className="hls-player-error">{error}</div>;
  }

  const activeLabel = levels.find((level) => level.index === activeLevel)?.label;
  const selectedLabel =
    selectedLevel === AUTO_LEVEL
      ? 'Tự động'
      : levels.find((level) => level.index === selectedLevel)?.label ?? 'Tự động';

  return (
    <div className="hls-player">
      <video ref={videoRef} className={className} controls playsInline onEnded={onEnded} />

      { }
      {levels.length > 1 && (

        <div className="hls-quality" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="hls-quality-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            title="Chất lượng video"
          >
            <i className="bi bi-gear-fill"></i>
            {selectedLabel}
          </button>

          {menuOpen && (
            <ul className="hls-quality-menu" role="menu">
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  className={`hls-quality-option${
                    selectedLevel === AUTO_LEVEL ? ' is-active' : ''
                  }`}
                  onClick={() => changeLevel(AUTO_LEVEL)}
                >
                  Tự động
                  {activeLabel && <span className="hls-quality-auto-hint">{activeLabel}</span>}
                </button>
              </li>

              {levels.map((level) => (
                <li key={level.index} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={`hls-quality-option${
                      selectedLevel === level.index ? ' is-active' : ''
                    }`}
                    onClick={() => changeLevel(level.index)}
                  >
                    {level.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default HlsPlayer;
