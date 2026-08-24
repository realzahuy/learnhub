import { useEffect, useRef, useState } from 'react';
import type Hls from 'hls.js';
import { resolveHlsUrl } from '../../config/runtimeConfig';
import { getAccessToken } from '../../services/api/tokenStore';
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

const AUTO_LEVEL = -1;

const HlsPlayer = ({ playbackUrl, className, onEnded }: HlsPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  const hlsRef = useRef<Hls | null>(null);

  const [levels, setLevels] = useState<QualityLevel[]>([]);

  const [selectedLevel, setSelectedLevel] = useState(AUTO_LEVEL);

  const [activeLevel, setActiveLevel] = useState(AUTO_LEVEL);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);
    setLevels([]);
    setSelectedLevel(AUTO_LEVEL);
    setActiveLevel(AUTO_LEVEL);
    setMenuOpen(false);

    let url: string;
    try {
      url = resolveHlsUrl(playbackUrl);
    } catch (urlError) {
      console.error('URL phát video không hợp lệ:', urlError);
      setError('Không phát được video do cấu hình URL không hợp lệ.');
      return;
    }
    const token = getAccessToken();
    let cancelled = false;
    let hls: Hls | null = null;
    let usesNativePlayback = false;

    const initializePlayer = async () => {
      try {
        if (!token && video.canPlayType('application/vnd.apple.mpegurl')) {
          usesNativePlayback = true;
          video.src = url;
          video.load();
          return;
        }

        const { default: Hls } = await import('hls.js');
        if (cancelled) return;

        if (!Hls.isSupported()) {
          setError('Trình duyệt này chưa phát được video. Hãy dùng Chrome, Edge hoặc Firefox.');
          return;
        }

        hls = new Hls({
          xhrSetup: (xhr) => {
            if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
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

        hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          if (cancelled) return;
          setActiveLevel(data.level);
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (cancelled || !data.fatal) return;
          console.error('Lỗi HLS:', data);
          setError('Không phát được video. Vui lòng tải lại trang.');
        });

        hls.loadSource(url);
        hls.attachMedia(video);
      } catch (loadError) {
        if (cancelled) return;
        console.error('Không thể tải trình phát HLS:', loadError);
        setError('Không phát được video. Vui lòng tải lại trang.');
      }
    };

    void initializePlayer();

    return () => {
      cancelled = true;
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
