import React from 'react';
import { Video, VIDEO_STATUS_LABELS } from '../../../types/lesson.types';
import { toProcessingTotalProgress } from '../../../utils';

interface LessonVideoItemProps {
  video: Video;

  processingProgress: number;
  disabled: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  dragItemProps: React.HTMLAttributes<HTMLLIElement> & { draggable: boolean };
  dragHandleProps: React.HTMLAttributes<HTMLButtonElement>;
  onDelete: (video: Video) => void;
  onPreview: (video: Video) => void;
}

const LessonVideoItem = ({
  video,
  processingProgress,
  disabled,
  isDragging,
  isDropTarget,
  dragItemProps,
  dragHandleProps,
  onDelete,
  onPreview,
}: LessonVideoItemProps) => {
  const canDelete = video.status === 'UPLOADING' || video.status === 'FAILED';
  const percent = video.status === 'READY'
    ? 100
    : video.status === 'PROCESSING'
      ? toProcessingTotalProgress(processingProgress)
      : 0;
  const showProgress = video.status === 'READY' || video.status === 'PROCESSING';

  return (
    <li
      className={`lesson-media-item${isDragging ? ' is-dragging' : ''}${
        isDropTarget ? ' is-drop-target' : ''
      }`}
      {...dragItemProps}
      draggable={dragItemProps.draggable && !disabled}
    >
      <button
        type="button"
        className="lesson-row-handle lesson-media-handle"
        {...dragHandleProps}
        disabled={disabled}
        aria-label={`Đổi vị trí video ${video.title}`}
        title="Kéo để đổi vị trí, hoặc dùng phím mũi tên lên/xuống"
      >
        <i className="bi bi-grip-vertical" />
      </button>

      <div className="lesson-media-body">
        <span className="lesson-media-title">{video.title}</span>
        {showProgress ? (
          <div
            className={`lesson-progress ${video.status === 'READY' ? 'lesson-progress-done' : ''}`}
            role="status"
            title={video.status === 'PROCESSING'
              ? `MediaConvert đã xử lý ${Math.round(processingProgress)}%`
              : undefined}
          >
            <div className="lesson-progress-bar"><span style={{ width: `${percent}%` }} /></div>
            <span className="lesson-progress-text">
              {video.status === 'READY' ? 'Hoàn tất' : 'Đang xử lý'} {percent}%
            </span>
          </div>
        ) : (
          <span className={`lesson-status lesson-status-${video.status.toLowerCase()}`}>
            <i className="bi bi-camera-video" />{VIDEO_STATUS_LABELS[video.status]}
          </span>
        )}
      </div>

      {video.status === 'READY' && video.playbackUrl && (
        <button
          type="button"
          className="btn-lesson-icon"
          onClick={() => onPreview(video)}
          disabled={disabled}
          aria-label={`Xem trước video ${video.title}`}
          title="Xem trước video"
        >
          <i className="bi bi-play-circle" />
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          className="btn-lesson-icon btn-lesson-icon-danger"
          onClick={() => onDelete(video)}
          disabled={disabled}
          aria-label={`Xóa video ${video.title}`}
          title="Xóa video"
        >
          <i className="bi bi-trash3" />
        </button>
      )}
    </li>
  );
};

export default LessonVideoItem;
