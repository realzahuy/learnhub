import { AppNotification } from '../../types/notification.types';
import {
  AccountLockedEvent,
  CourseStatusChangedEvent,
  RealtimeConnectedEvent,
  SSE_EVENT_NAMES,
} from '../../types/realtime.types';
import { notifyAccountLocked } from '../authSessionEvents';
import { buildApiUrl } from '../../config/runtimeConfig';
import apiClient, { authenticatedFetch } from './config';
import { consumeJsonSseEvents } from './sse';

interface RealtimeStreamHandlers {
  onConnected?: (event: RealtimeConnectedEvent) => void;
  onNotification?: (notification: AppNotification) => void;
  onCourseStatusChanged?: (event: CourseStatusChangedEvent) => void;
}

interface NotificationPage {
  content: AppNotification[];
  last: boolean;
  unreadCount: number;
  nextCursorCreatedAt: string | null;
  nextCursorId: number | null;
}

export interface NotificationCursor {
  createdAt: string;
  id: number;
}

export const notificationService = {
  list: async (
    cursor: NotificationCursor | null,
    size: number,
    signal?: AbortSignal
  ): Promise<NotificationPage> => {
    const response = await apiClient.get<NotificationPage>('/notifications', {
      params: {
        size,
        cursorCreatedAt: cursor?.createdAt,
        cursorId: cursor?.id,
      },
      signal,
      showTopProgress: false,
    });
    return response.data;
  },

  markAsRead: async (id: number): Promise<AppNotification> => {
    const response = await apiClient.put<AppNotification>(`/notifications/${id}/read`);
    return response.data;
  },

  stream: async (
    handlers: RealtimeStreamHandlers,
    signal: AbortSignal
  ): Promise<void> => {
    const response = await authenticatedFetch(buildApiUrl('notifications/stream'), {
      method: 'GET',
      headers: { Accept: 'text/event-stream' },
      cache: 'no-store',
      signal,
    });
    await consumeJsonSseEvents(response, {
      [SSE_EVENT_NAMES.CONNECTED]: (data) =>
        handlers.onConnected?.(data as RealtimeConnectedEvent),
      [SSE_EVENT_NAMES.NOTIFICATION]: (data) =>
        handlers.onNotification?.(data as AppNotification),
      [SSE_EVENT_NAMES.COURSE_STATUS_CHANGED]: (data) =>
        handlers.onCourseStatusChanged?.(data as CourseStatusChangedEvent),
      [SSE_EVENT_NAMES.ACCOUNT_LOCKED]: (data) =>
        notifyAccountLocked((data as AccountLockedEvent).message),
    });
  },
};
