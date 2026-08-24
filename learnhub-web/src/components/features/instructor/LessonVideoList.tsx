import React, { useCallback, useRef, useState } from 'react';
import { Lesson, Video } from '../../../types/lesson.types';
import { videoService } from '../../../services/api/video.service';
import { useDragReorder } from '../../../hooks/useDragReorder';
import VideoPreviewModal from './VideoPreviewModal';
import LessonVideoItem from './LessonVideoItem';
import { uiConfig } from '../../../config/uiConfig';
import { useDeferredSave } from '../../../hooks/useDeferredSave';
import { useLessonVideoUpload } from '../../../hooks/useLessonVideoUpload';
import { useToast } from '../../../context/ToastContext';
import {
  ALLOWED_VIDEO_EXTENSIONS,
  getApiErrorMessage,
  toUploadTotalProgress,
} from '../../../utils';

interface LessonVideoListProps {
  lesson: Lesson;

  videos: Video[];
  disabled: boolean;
  isAdding: boolean;
  processingProgressByVideoId: Record<number, number>;

  onVideosChange: (lessonId: number, updater: (prev: Video[]) => Video[]) => void;
  onAddFinished: () => void;
}

const LessonVideoList: React.FC<LessonVideoListProps> = ({
  lesson,
  videos,
  disabled,
  isAdding,
  processingProgressByVideoId,
  onVideosChange,
  onAddFinished,
}) => {
  const { showToast } = useToast();
  const {
    newTitle,
    setNewTitle,
    pending,
    error,
    setError,
    fileInputRef,
    handlePickVideo,
  } = useLessonVideoUpload(lesson, videos, onVideosChange);

  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);
  const deletingVideoIdsRef = useRef(new Set<number>());
  const [deletingVideoIds, setDeletingVideoIds] = useState<Set<number>>(() => new Set());

  const rollbackRef = useRef<Video[] | null>(null);

  const saveOrder = useCallback(
    async (order: Video[]) => {
      try {
        const saved = await videoService.reorder(
          lesson.id,
          order.map((video) => ({ id: video.id, position: video.position }))
        );
        rollbackRef.current = null;

        const shown = new Set(order.map((video) => video.id));
        onVideosChange(lesson.id, () => saved.filter((video) => shown.has(video.id)));
      } catch (err) {
        console.error('Không thể đổi thứ tự video:', err);
        const rollback = rollbackRef.current;
        rollbackRef.current = null;
        if (rollback) onVideosChange(lesson.id, () => rollback);
        setError(getApiErrorMessage(err, 'Không đổi được thứ tự video. Vui lòng thử lại.'));
      }
    },
    [lesson.id, onVideosChange, setError]
  );

  const [scheduleSaveOrder] = useDeferredSave(
    saveOrder,
    uiConfig.timing.reorderSaveDelayMs
  );

  const applyOrder = useCallback(
    (next: Video[]) => {
      if (!rollbackRef.current) rollbackRef.current = videos;

      const renumbered = next.map((video, index) => ({ ...video, position: index + 1 }));
      setError(null);
      onVideosChange(lesson.id, () => renumbered);
      scheduleSaveOrder(renumbered);
    },
    [lesson.id, videos, onVideosChange, scheduleSaveOrder, setError]
  );

  const drag = useDragReorder(videos, applyOrder);

  const handleDelete = useCallback(
    async (video: Video) => {
      if (deletingVideoIdsRef.current.has(video.id)) return;

      deletingVideoIdsRef.current.add(video.id);
      setDeletingVideoIds((previous) => new Set(previous).add(video.id));
      setError(null);
      try {
        await videoService.remove(lesson.id, video.id);
        onVideosChange(lesson.id, (prev) => prev.filter((v) => v.id !== video.id));
        showToast(`Đã xóa video "${video.title}"`, 'success');
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          onVideosChange(lesson.id, (prev) => prev.filter((v) => v.id !== video.id));
          showToast(`Đã xóa video "${video.title}"`, 'success');
        } else {
          console.error('Không thể xóa video:', err);
          setError(getApiErrorMessage(err, 'Không xóa được video. Vui lòng thử lại.'));
        }
      } finally {
        deletingVideoIdsRef.current.delete(video.id);
        setDeletingVideoIds((previous) => {
          const next = new Set(previous);
          next.delete(video.id);
          return next;
        });
      }
    },
    [lesson.id, onVideosChange, setError, showToast]
  );

  const handleRename = useCallback(async (video: Video, title: string): Promise<boolean> => {
    setError(null);
    try {
      const updated = await videoService.updateTitle(lesson.id, video.id, title);
      onVideosChange(lesson.id, (previous) => previous.map((item) => item.id === updated.id ? updated : item));
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không đổi được tên video. Vui lòng thử lại.'));
      return false;
    }
  }, [lesson.id, onVideosChange, setError]);

  const uploading = pending.length > 0;
  const canPick = isAdding && !disabled && !uploading && newTitle.trim() !== '';

  const handleVideoFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const uploaded = await handlePickVideo(event);
      if (uploaded) onAddFinished();
    },
    [handlePickVideo, onAddFinished]
  );

  return (
    <div className="lesson-media">
      {videos.length === 0 && pending.length === 0 ? (
        <p className="lesson-media-empty">
          <i className="bi bi-camera-video-off"></i>
          Chưa có video
        </p>
      ) : (
        <ol className="lesson-media-list">
          {videos.map((video) => (
            <LessonVideoItem
              key={video.id}
              video={video}
              processingProgress={processingProgressByVideoId[video.id] ?? 0}
              disabled={disabled}
              deleting={deletingVideoIds.has(video.id)}
              isDragging={drag.isDragging(video.id)}
              isDropTarget={drag.isDropTarget(video.id)}
              getDragItemProps={drag.itemProps}
              getDragHandleProps={drag.handleProps}
              onDelete={handleDelete}
              onPreview={setPreviewVideo}
              onRename={handleRename}
            />
          ))}

          {
}
          {pending.map((item) => (
            <li className="lesson-media-item" key={`pending-${item.key}`}>
              <span className="lesson-media-handle-space" aria-hidden="true"></span>

              <div className="lesson-media-body">
                <span className="lesson-media-title">{item.title}</span>
                <div className="lesson-progress" role="status">
                  <div className="lesson-progress-bar">
                    <span
                      style={{ width: `${toUploadTotalProgress(item.uploadPercent)}%` }}
                    />
                  </div>
                  <span className="lesson-progress-text">
                    Đang tải lên {toUploadTotalProgress(item.uploadPercent)}%
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {error && <span className="lesson-media-error">{error}</span>}

      {
}
      {isAdding && (
        <div className="lesson-media-add-form">
          <div className="lesson-media-add">
            <input
              type="text"
              className="form-control lesson-media-add-input"
              placeholder="Tên video"
              value={newTitle}
              onChange={(e) => {
                setError(null);
                setNewTitle(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canPick) {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              maxLength={255}
              disabled={disabled || uploading}
              aria-label={`Tên video của bài giảng ${lesson.title}`}
              autoFocus
            />

            <button
              type="button"
              className="btn-lesson-add-inline"
              onClick={() => fileInputRef.current?.click()}
              disabled={!canPick}
              title={canPick ? undefined : 'Nhập tên video trước đã'}
            >
              <i className="bi bi-upload"></i>
              Chọn video
            </button>

            <button
              type="button"
              className="btn-lesson-ghost"
              onClick={() => {
                setNewTitle('');
                setError(null);
                onAddFinished();
              }}
              disabled={disabled || uploading}
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="d-none"
        accept={ALLOWED_VIDEO_EXTENSIONS.join(',')}
        onChange={handleVideoFileChange}
      />

      {previewVideo && (
        <VideoPreviewModal video={previewVideo} onClose={() => setPreviewVideo(null)} />
      )}
    </div>
  );
};

const areLessonVideoListPropsEqual = (
  previous: LessonVideoListProps,
  next: LessonVideoListProps
) => {
  if (previous.lesson !== next.lesson
      || previous.videos !== next.videos
      || previous.disabled !== next.disabled
      || previous.isAdding !== next.isAdding
      || previous.onVideosChange !== next.onVideosChange
      || previous.onAddFinished !== next.onAddFinished) {
    return false;
  }

  return next.videos.every((video) => (
    previous.processingProgressByVideoId[video.id]
      === next.processingProgressByVideoId[video.id]
  ));
};

export default React.memo(LessonVideoList, areLessonVideoListPropsEqual);
