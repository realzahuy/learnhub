type NotificationType = 'COURSE_APPROVED' | 'COURSE_REJECTED';

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  content: string;
  courseId: number | null;
  readAt: string | null;
  createdAt: string;
}
