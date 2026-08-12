import { LearnVideo } from '../../../types/learn.types';

export type Viewing =
  | { kind: 'video'; lessonId: number; video: LearnVideo }
  | { kind: 'quiz'; lessonId: number };

export type LearnTab = 'overview' | 'recommendations' | 'reviews';
