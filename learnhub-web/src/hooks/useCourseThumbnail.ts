import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { validateImageFile } from '../utils';

export function useCourseThumbnail(onValidationError: (message: string | null) => void) {
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  const handlePickThumbnail = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const invalidReason = validateImageFile(file);
    if (invalidReason) {
      onValidationError(invalidReason);
      return;
    }

    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const preview = URL.createObjectURL(file);
    previewRef.current = preview;
    setThumbnailFile(file);
    setThumbnailPreview(preview);
    onValidationError(null);
  }, [onValidationError]);

  const clearThumbnailFile = useCallback(() => setThumbnailFile(null), []);

  return {
    thumbnailFile,
    thumbnailPreview,
    fileInputRef,
    handlePickThumbnail,
    clearThumbnailFile,
  };
}
