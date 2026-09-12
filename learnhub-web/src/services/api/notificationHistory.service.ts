import { AppNotification } from '../../types/notification.types';
import apiClient from './config';

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

};
