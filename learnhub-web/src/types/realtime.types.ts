import { CourseStatus } from './course.types';

export const SSE_EVENT_NAMES = {
  CONNECTED: 'connected',
  NOTIFICATION: 'notification',
  COURSE_STATUS_CHANGED: 'course-status-changed',
} as const;

export interface RealtimeConnectedEvent {
  userId: number;
}

export interface CourseStatusChangedEvent {
  courseId: number;
  status: CourseStatus;
}
