
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
];

export const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv'];

const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024;

const UPLOAD_SHARE = 50;
const PROCESSING_SHARE = 49;
const clampPercent = (percent: number) => Math.max(0, Math.min(100, percent));

export const toUploadTotalProgress = (uploadPercent: number): number =>
  Math.round((clampPercent(uploadPercent) * UPLOAD_SHARE) / 100);

export const toProcessingTotalProgress = (processingPercent: number): number =>
  UPLOAD_SHARE + Math.round((clampPercent(processingPercent) * PROCESSING_SHARE) / 100);

const COMBINING_MARKS = new RegExp('[\u0300-\u036f]', 'g');

const EXTENSION_BY_TYPE: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/x-msvideo': 'avi',
  'video/x-matroska': 'mkv',
};

export const sanitizeVideoFileName = (fileName: string, contentType: string): string => {
  const dot = fileName.lastIndexOf('.');
  const rawName = dot > 0 ? fileName.slice(0, dot) : fileName;
  const rawExtension = dot > 0 ? fileName.slice(dot + 1).toLowerCase() : '';
  const extension = ALLOWED_VIDEO_EXTENSIONS.includes(`.${rawExtension}`)
    ? rawExtension
    : EXTENSION_BY_TYPE[contentType] ?? 'mp4';

  const asciiName = rawName

    .normalize('NFD')
    .replace(COMBINING_MARKS, '')

    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^\w\-. ]+/g, '-')

    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${asciiName || 'video'}.${extension}`;
};

export const validateVideoFile = (file: File): string | null => {
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return 'Chỉ chấp nhận video MP4, MOV, AVI hoặc MKV';
  }
  if (file.size > MAX_VIDEO_SIZE) {
    return 'Video vượt quá dung lượng cho phép (tối đa 2 GB)';
  }
  return null;
};
