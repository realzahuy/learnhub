import type { Question } from './question.types';

export interface Lesson {
  id: number;
  title: string;
  position: number;
  isPreview: boolean;
  courseId: number;
}

export interface LessonPayload {
  title: string;
  isPreview?: boolean;
  position?: number;
}

export interface LessonReorderPayload {
  id: number;
  position: number;
}

export type VideoStatus = 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';

export const VIDEO_STATUS_LABELS: Record<VideoStatus, string> = {
  UPLOADING: 'Chưa tải lên xong',
  PROCESSING: 'Đang xử lý',
  READY: 'Sẵn sàng',
  FAILED: 'Thất bại',
};

export interface Video {
  id: number;
  title: string;
  status: VideoStatus;
  position: number;
  durationSeconds: number | null;
  playbackUrl: string | null;
}

export interface VideoReorderPayload {
  id: number;
  position: number;
}

export interface VideoUploadPayload {
  title: string;
  position: number;
  fileName: string;
  contentType: string;
  fileSize: number;
}

export interface VideoUploadSession {
  videoId: number;
  uploadUrl: string;
  uploadFields: Record<string, string>;
  objectKey: string;
  expiresIn: number;
}

export interface InstructorLessonContent extends Lesson {
  videos: Video[];
  questions: Question[];
}

export interface InstructorCourseContent {
  courseId: number;
  courseTitle: string;
  lessons: InstructorLessonContent[];
}
