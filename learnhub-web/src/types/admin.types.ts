
export type AdminUserFilter = 'ALL' | 'INSTRUCTOR' | 'LOCKED';
type AccountStatus = 'ACTIVE' | 'LOCKED';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  avatar: string | null;
  bio: string | null;
  emailVerified: boolean;
  accountStatus: AccountStatus;
  roles: string[];

  createdAt: string | null;

  lastLogin: string | null;

  totalCourses: number;
  publishedCourses: number;
  pendingCourses: number;
  draftCourses: number;
  rejectedCourses: number;

  totalStudents: number;
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
import type { LearnVideo } from './learn.types';
import type { Question } from './question.types';
