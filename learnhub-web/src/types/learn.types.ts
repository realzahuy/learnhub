import { Question } from './question.types';

export interface LearnVideo {
  id: number;
  title: string;
  durationSeconds: number | null;

  playbackUrl: string | null;
  status: string;
}

interface LearnLesson {
  id: number;
  title: string;
  position: number;
  isPreview: boolean;
  videos: LearnVideo[];
  questionCount: number;
}

export interface AdminLessonContent {
  id: number;
  title: string;
  position: number;
  isPreview: boolean;
  videos: LearnVideo[];
  questions: Question[];
}

export interface AdminCourseContent {
  courseId: number;
  courseTitle: string;
  lessons: AdminLessonContent[];
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
