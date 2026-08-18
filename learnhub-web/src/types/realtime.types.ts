import { CourseStatus } from './course.types';

export const SSE_EVENT_NAMES = {
  CONNECTED: 'connected',
  NOTIFICATION: 'notification',
  COURSE_STATUS_CHANGED: 'course-status-changed',
  ACCOUNT_LOCKED: 'account-locked',
} as const;

export interface RealtimeConnectedEvent {
  userId: number;
}

export interface CourseStatusChangedEvent {
  courseId: number;
  status: CourseStatus;
  title: string;
  categoryName: string;
}

export interface AccountLockedEvent {
  message: string;
}
