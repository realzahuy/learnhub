import { useCallback, useRef, useState } from 'react';
import { uiConfig } from '../config/uiConfig';
import { videoService } from '../services/api/video.service';
import { Lesson, Video } from '../types/lesson.types';
import {
  getApiErrorMessage,
  sanitizeVideoFileName,
  validateVideoFile,
} from '../utils';

export interface PendingVideoUpload {
  key: number;
  title: string;
  uploadPercent: number;
}

export const useLessonVideoUpload = (
  lesson: Lesson,
  videos: Video[],
  onVideosChange: (lessonId: number, updater: (previous: Video[]) => Video[]) => void
) => {
  const [newTitle, setNewTitle] = useState('');
  const [pending, setPending] = useState<PendingVideoUpload[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nextKeyRef = useRef(1);
  const reservedPositionRef = useRef(0);

  const handlePickVideo = useCallback(async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<boolean> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return false;

    const title = newTitle.trim().slice(0, 255);
    if (!title) {
      setError('Nhập tên video trước khi chọn tệp');
      return false;
    }
    const invalidReason = validateVideoFile(file);
    if (invalidReason) {
      setError(invalidReason);
      return false;
    }

    setError(null);
    setNewTitle('');
    const key = nextKeyRef.current++;
    setPending((previous) => [...previous, { key, title, uploadPercent: 0 }]);
    const maxExisting = videos.reduce((max, video) => Math.max(max, video.position), 0);
    const position = Math.max(maxExisting, reservedPositionRef.current) + 1;
    reservedPositionRef.current = position;
    let videoId: number | null = null;
    let latestUploadPercent = 0;
    let lastProgressUpdateAt = 0;
    let progressTimer: number | undefined;

    const commitUploadProgress = () => {
      progressTimer = undefined;
      lastProgressUpdateAt = Date.now();
      setPending((previous) => {
        let changed = false;
        const next = previous.map((item) => {
          if (item.key !== key || latestUploadPercent <= item.uploadPercent) return item;
          changed = true;
          return { ...item, uploadPercent: latestUploadPercent };
        });
        return changed ? next : previous;
      });
    };

    const updateUploadProgress = (uploadPercent: number) => {
      if (!Number.isFinite(uploadPercent)) return;
      const next = Math.max(0, Math.min(100, Math.round(uploadPercent)));
      if (next <= latestUploadPercent) return;
      latestUploadPercent = next;

      const elapsed = Date.now() - lastProgressUpdateAt;
      if (next === 100 || elapsed >= uiConfig.video.uploadProgressUpdateMs) {
        if (progressTimer !== undefined) window.clearTimeout(progressTimer);
        commitUploadProgress();
      } else if (progressTimer === undefined) {
        progressTimer = window.setTimeout(
          commitUploadProgress,
          uiConfig.video.uploadProgressUpdateMs - elapsed
        );
      }
    };

    try {
      const contentType = file.type;
      const session = await videoService.requestUploadUrl(lesson.id, {
        title,
        position,
        fileName: sanitizeVideoFileName(file.name, contentType),
        contentType,
        fileSize: file.size,
      });
      videoId = session.videoId;
      await videoService.uploadToStorage(
        session.uploadUrl,
        session.uploadFields,
        file,
        updateUploadProgress
      );
      updateUploadProgress(100);
      const uploaded = await videoService.getVideo(lesson.id, session.videoId);
      onVideosChange(lesson.id, (previous) => [...previous, uploaded]);
      return true;
    } catch (cause) {
      console.error('Không thể tải video lên:', cause);
      setError(getApiErrorMessage(cause, 'Không tải được video lên. Vui lòng thử lại.'));
      if (videoId !== null) {
        try {
          const orphan = await videoService.getVideo(lesson.id, videoId);
          onVideosChange(lesson.id, (previous) => [...previous, orphan]);
        } catch (fetchError) {
          console.error('Không thể tải thông tin video bị lỗi:', fetchError);
        }
      }
      return false;
    } finally {
      if (progressTimer !== undefined) window.clearTimeout(progressTimer);
      setPending((previous) => previous.filter((item) => item.key !== key));
    }
  }, [lesson.id, newTitle, videos, onVideosChange]);

  return {
    newTitle,
    setNewTitle,
    pending,
    error,
    setError,
    fileInputRef,
    handlePickVideo,
  };
};
