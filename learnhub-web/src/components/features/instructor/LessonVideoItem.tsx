import React, { useEffect, useRef, useState } from 'react';
import { Video, VIDEO_STATUS_LABELS } from '../../../types/lesson.types';
import { toProcessingTotalProgress, toUploadTotalProgress } from '../../../utils';

type DragItemProps = React.HTMLAttributes<HTMLLIElement> & { draggable: boolean };
type DragHandleProps = React.HTMLAttributes<HTMLButtonElement>;

interface LessonVideoItemProps {
  video: Video;

  processingProgress: number;
  disabled: boolean;
  deleting: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  getDragItemProps: (id: number) => DragItemProps;
  getDragHandleProps: (id: number) => DragHandleProps;
  onDelete: (video: Video) => void;
  onPreview: (video: Video) => void;
  onRename: (video: Video, title: string) => Promise<boolean>;
}

const LessonVideoItem = ({
  video,
  processingProgress,
  disabled,
  deleting,
  isDragging,
  isDropTarget,
  getDragItemProps,
  getDragHandleProps,
  onDelete,
  onPreview,
  onRename,
}: LessonVideoItemProps) => {
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(video.title);
  const [savingTitle, setSavingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (editing) titleInputRef.current?.select();
  }, [editing]);

  useEffect(() => {
    setTitleDraft(video.title);
  }, [video.title]);

  const finishEditing = async () => {
    if (cancelRef.current) {
      cancelRef.current = false;
      setTitleDraft(video.title);
      setEditing(false);
      return;
    }

    const next = titleDraft.trim();
    if (!next || next === video.title) {
      setTitleDraft(video.title);
      setEditing(false);
      return;
    }

    setSavingTitle(true);
    const saved = await onRename(video, next);
    setSavingTitle(false);
    if (saved) setEditing(false);
    else titleInputRef.current?.focus();
  };

  const canDelete = video.status === 'UPLOADING'
    || video.status === 'FAILED'
    || video.status === 'READY';
  const percent = video.status === 'READY'
    ? 100
    : video.status === 'PROCESSING'
      ? toProcessingTotalProgress(processingProgress)
      : video.status === 'UPLOADING'
        ? toUploadTotalProgress(100)
        : 0;
  const showProgress = video.status !== 'FAILED';
  const dragItemProps = getDragItemProps(video.id);
  const dragHandleProps = getDragHandleProps(video.id);

  return (
    <li
      className={`lesson-media-item${isDragging ? ' is-dragging' : ''}${
        isDropTarget ? ' is-drop-target' : ''
      }`}
      {...dragItemProps}
      draggable={dragItemProps.draggable && !disabled && !deleting}
    >
      <button
        type="button"
        className="lesson-row-handle lesson-media-handle"
        {...dragHandleProps}
        disabled={disabled || deleting}
        aria-label={`Đổi vị trí video ${video.title}`}
        title="Kéo để đổi vị trí, hoặc dùng phím mũi tên lên/xuống"
      >
        <i className="bi bi-grip-vertical" />
      </button>

      <div className="lesson-media-body">
        {editing ? (
          <input
            ref={titleInputRef}
            type="text"
            className="form-control lesson-media-title-input"
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={finishEditing}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                event.currentTarget.blur();
              } else if (event.key === 'Escape') {
                cancelRef.current = true;
                event.currentTarget.blur();
              }
            }}
            maxLength={255}
            disabled={savingTitle}
            aria-label="Tên video"
          />
        ) : (
          <button
            type="button"
            className="lesson-media-title-button"
            onClick={() => setEditing(true)}
            disabled={disabled || deleting}
            title="Bấm để sửa tên video"
          >
            <span className="lesson-media-title">{video.title}</span>
          </button>
        )}
        {showProgress ? (
          <div
            className={`lesson-progress ${video.status === 'READY' ? 'lesson-progress-done' : ''}`}
            title={video.status === 'PROCESSING'
              ? `MediaConvert đã xử lý ${Math.round(processingProgress)}%`
              : undefined}
          >
            <div className="lesson-progress-bar"><span style={{ width: `${percent}%` }} /></div>
            <span className="lesson-progress-text" role="status">
              {video.status === 'READY' ? 'Hoàn tất' : 'Đang xử lý'} {percent}%
            </span>
            {video.status === 'READY' && video.playbackUrl && (
              <button
                type="button"
                className="btn-lesson-icon"
                onClick={() => onPreview(video)}
                disabled={disabled || deleting}
                aria-label={`Xem trước video ${video.title}`}
                title="Xem trước video"
              >
                <i className="bi bi-play-circle" />
              </button>
            )}
          </div>
        ) : (
          <span className={`lesson-status lesson-status-${video.status.toLowerCase()}`}>
            <i className="bi bi-camera-video" />{VIDEO_STATUS_LABELS[video.status]}
          </span>
        )}
      </div>

      {canDelete && (
        <button
          type="button"
          className="btn-lesson-icon btn-lesson-icon-danger"
          onClick={() => onDelete(video)}
          disabled={disabled || deleting || savingTitle}
          aria-label={deleting ? `Đang xóa video ${video.title}` : `Xóa video ${video.title}`}
          title={deleting ? 'Đang xóa video' : 'Xóa video'}
        >
          {deleting ? 'Đang xóa...' : 'Xóa'}
        </button>
      )}
    </li>
  );
};

export default React.memo(LessonVideoItem);
