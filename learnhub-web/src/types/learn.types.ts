import type { VideoStatus } from './lesson.types';

export interface LearnVideo {
  id: number;
  title: string;
  durationSeconds: number | null;

  playbackUrl: string | null;
  status: VideoStatus;
}

export interface LearnLesson {
  id: number;
  title: string;
  position: number;
  isPreview: boolean;
  videos: LearnVideo[];
  questionCount: number;
}

export interface LearnCourse {
  id: number;
  title: string;
  slug: string;
  instructorName: string;
  lessons: LearnLesson[];
  totalLessons: number;

  quizPassPercent: number;
}

export type Viewing =
  | { kind: 'video'; lessonId: number; video: LearnVideo }
  | { kind: 'quiz'; lessonId: number };
