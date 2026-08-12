import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HlsPlayer } from '../../common';
import { Video } from '../../../types/lesson.types';

interface VideoPreviewModalProps {
  video: Video;
  onClose: () => void;
}

const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({ video, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!video.playbackUrl) return null;

  return createPortal(
    <div
      className="modal show d-block video-preview-modal"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content video-preview-content">
          <div className="video-preview-head">
            <h2 className="video-preview-title">{video.title}</h2>
            <button
              type="button"
              className="btn-lesson-icon"
              onClick={onClose}
              aria-label="Đóng"
              title="Đóng"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          <div className="video-preview-frame">
            <HlsPlayer
              playbackUrl={video.playbackUrl}
              className="video-preview-player"
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default VideoPreviewModal;
