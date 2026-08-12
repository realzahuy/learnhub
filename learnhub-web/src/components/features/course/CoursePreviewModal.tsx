import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { HlsPlayer } from '../../common';
import { PublicVideo } from '../../../types/course.types';
import { formatDuration } from '../../../utils';
import './CoursePreviewModal.css';

interface CoursePreviewModalProps {
  lessonTitle: string;

  videos: PublicVideo[];

  initialVideoId: number;
  onClose: () => void;
}

const CoursePreviewModal = ({
  lessonTitle,
  videos,
  initialVideoId,
  onClose,
}: CoursePreviewModalProps) => {
  const [currentId, setCurrentId] = useState(initialVideoId);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const currentIndex = Math.max(
    videos.findIndex((video) => video.id === currentId),
    0
  );
  const current = videos[currentIndex];
  if (!current?.previewUrl) return null;

  const goNext = () => {
    const next = videos[currentIndex + 1];
    if (next) setCurrentId(next.id);
  };

  return createPortal(
    <div
      className="modal show d-block course-preview-modal"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content course-preview-content">
          <div className="course-preview-head">
            <div className="course-preview-heading">
              <span className="course-preview-eyebrow">Xem thử</span>
              <h2 className="course-preview-lesson">{lessonTitle}</h2>
            </div>
            <button
              type="button"
              className="course-preview-close"
              onClick={onClose}
              aria-label="Đóng"
              title="Đóng"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          <div className="course-preview-frame">
            {
}
            <HlsPlayer
              key={current.id}
              playbackUrl={current.previewUrl}
              className="course-preview-player"
              onEnded={goNext}
            />
          </div>

          { }
          {videos.length > 1 && (
            <ul className="course-preview-list">
              {videos.map((video) => (
                <li key={video.id}>
                  <button
                    type="button"
                    className={`course-preview-item${
                      video.id === current.id ? ' is-active' : ''
                    }`}
                    onClick={() => setCurrentId(video.id)}
                  >
                    <i
                      className={`bi ${
                        video.id === current.id ? 'bi-play-fill' : 'bi-play-btn'
                      } course-preview-item-icon`}
                    ></i>
                    <span className="course-preview-item-title">{video.title}</span>
                    {video.durationSeconds != null && (
                      <span className="course-preview-item-duration">
                        {formatDuration(video.durationSeconds)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CoursePreviewModal;
