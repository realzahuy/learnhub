import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { uiConfig } from '../config/uiConfig';
import {
  NotificationCursor,
  notificationService,
} from '../services/api/notificationHistory.service';
import { ROLE_INSTRUCTOR } from '../types/auth.types';
import { AppNotification } from '../types/notification.types';
import { useCourseRealtime } from './NotificationContext';
import { useAuth } from './AuthContext';

interface NotificationHistoryContextType {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
}

const NotificationHistoryContext = createContext<NotificationHistoryContextType | undefined>(
  undefined
);
export const InstructorNotificationProvider = ({ children }: { children: ReactNode }) => {
  const { userId, roles } = useAuth();
  const { registerNotificationHistory } = useCourseRealtime();
  const shouldReceiveNotificationHistory = userId !== null && roles.includes(ROLE_INSTRUCTOR);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const knownIds = useRef(new Set<number>());
  const nextCursor = useRef<NotificationCursor | null>(null);
  const loadingMore = useRef(false);
  const refreshingHistory = useRef(false);
  const historyRequestGeneration = useRef(0);
  const historyContextGeneration = useRef(0);
  const markingAsReadIds = useRef(new Set<number>());
  const notificationsRef = useRef<AppNotification[]>([]);
  const historyController = useRef<AbortController | null>(null);
  const notificationHistoryEnabled = useRef(shouldReceiveNotificationHistory);
  notificationHistoryEnabled.current = shouldReceiveNotificationHistory;

  const resetHistory = useCallback(() => {
    historyRequestGeneration.current += 1;
    historyContextGeneration.current += 1;
    knownIds.current.clear();
    nextCursor.current = null;
    loadingMore.current = false;
    refreshingHistory.current = false;
    markingAsReadIds.current.clear();
    notificationsRef.current = [];
    setNotifications([]);
    setUnreadCount(0);
    setIsLoading(false);
    setIsLoadingMore(false);
    setError(null);
    setHasMore(false);
  }, []);

  const refreshHistory = useCallback(async (signal?: AbortSignal) => {
    if (!notificationHistoryEnabled.current || signal?.aborted) return;
    const requestGeneration = ++historyRequestGeneration.current;
    const knownAtStart = new Set(knownIds.current);
    refreshingHistory.current = true;
    loadingMore.current = false;
    setIsLoading(true);
    setIsLoadingMore(false);
    setError(null);
    try {
      const history = await notificationService.list(
        null,
        uiConfig.pagination.notificationHistoryPageSize,
        signal
      );
      if (!notificationHistoryEnabled.current
          || signal?.aborted
          || requestGeneration !== historyRequestGeneration.current) return;

      const snapshotIds = new Set(history.content.map((item) => item.id));
      const streamed = notificationsRef.current.filter((item) =>
        !knownAtStart.has(item.id) && !snapshotIds.has(item.id)
      );
      const merged = [...streamed, ...history.content];
      notificationsRef.current = merged;
      knownIds.current = new Set(merged.map((item) => item.id));
      nextCursor.current = history.nextCursorCreatedAt && history.nextCursorId
        ? { createdAt: history.nextCursorCreatedAt, id: history.nextCursorId }
        : null;
      setNotifications(merged);
      setUnreadCount(
        history.unreadCount + streamed.filter((item) => !item.readAt).length
      );
      setHasMore(!history.last);
    } catch (cause) {
      if (signal?.aborted || requestGeneration !== historyRequestGeneration.current) return;
      setError('Không tải được lịch sử thông báo.');
      throw cause;
    } finally {
      if (requestGeneration === historyRequestGeneration.current) {
        refreshingHistory.current = false;
        setIsLoading(false);
      }
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!notificationHistoryEnabled.current
        || !hasMore
        || loadingMore.current
        || refreshingHistory.current) return;

    const signal = historyController.current?.signal;
    if (!signal || signal.aborted) return;

    const requestGeneration = historyRequestGeneration.current;
    const cursor = nextCursor.current;
    loadingMore.current = true;
    setIsLoadingMore(true);
    setError(null);
    try {
      const history = await notificationService.list(
        cursor,
        uiConfig.pagination.notificationHistoryPageSize,
        signal
      );
      if (!notificationHistoryEnabled.current
          || signal.aborted
          || requestGeneration !== historyRequestGeneration.current) return;
      nextCursor.current = history.nextCursorCreatedAt && history.nextCursorId
        ? { createdAt: history.nextCursorCreatedAt, id: history.nextCursorId }
        : null;
      setHasMore(!history.last);
      const additions = history.content.filter((item) => !knownIds.current.has(item.id));
      additions.forEach((item) => knownIds.current.add(item.id));
      const merged = [...notificationsRef.current, ...additions];
      notificationsRef.current = merged;
      setNotifications(merged);
    } catch (cause) {
      if (signal.aborted || requestGeneration !== historyRequestGeneration.current) return;
      setError('Không tải thêm được thông báo.');
      throw cause;
    } finally {
      if (requestGeneration === historyRequestGeneration.current) {
        loadingMore.current = false;
        setIsLoadingMore(false);
      }
    }
  }, [hasMore]);

  const receiveNotification = useCallback((notification: AppNotification) => {
    if (knownIds.current.has(notification.id)) return;
    knownIds.current.add(notification.id);
    const next = [notification, ...notificationsRef.current];
    notificationsRef.current = next;
    setNotifications(next);
    if (!notification.readAt) {
      setUnreadCount((current) => current + 1);
    }
  }, []);

  useEffect(() => registerNotificationHistory({
    onNotification: (notification) => {
      if (notificationHistoryEnabled.current) receiveNotification(notification);
    },
    refresh: () => refreshHistory(historyController.current?.signal),
  }), [registerNotificationHistory, receiveNotification, refreshHistory]);

  useEffect(() => {
    historyController.current?.abort();
    historyController.current = null;
    resetHistory();

    if (!shouldReceiveNotificationHistory) {
      return;
    }

    const controller = new AbortController();
    historyController.current = controller;
    void refreshHistory(controller.signal).catch(() => {});

    return () => {
      controller.abort();
      if (historyController.current === controller) {
        historyController.current = null;
      }
    };
  }, [refreshHistory, resetHistory, shouldReceiveNotificationHistory, userId]);

  const markAsRead = useCallback(async (id: number) => {
    const current = notificationsRef.current.find((item) => item.id === id);
    if (!current || current.readAt || markingAsReadIds.current.has(id)) return;

    const contextGeneration = historyContextGeneration.current;
    markingAsReadIds.current.add(id);
    try {
      const updated = await notificationService.markAsRead(id);
      if (contextGeneration !== historyContextGeneration.current) return;

      const latest = notificationsRef.current.find((item) => item.id === id);
      if (!latest || latest.readAt || !updated.readAt) return;

      const next = notificationsRef.current.map((item) => (item.id === id ? updated : item));
      notificationsRef.current = next;
      setNotifications(next);
      setUnreadCount((count) => Math.max(0, count - 1));
    } finally {
      if (contextGeneration === historyContextGeneration.current) {
        markingAsReadIds.current.delete(id);
      }
    }
  }, []);

  const historyValue = useMemo<NotificationHistoryContextType>(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      isLoadingMore,
      error,
      hasMore,
      loadMore,
      markAsRead,
    }),
    [
      notifications,
      unreadCount,
      isLoading,
      isLoadingMore,
      error,
      hasMore,
      loadMore,
      markAsRead,
    ]
  );
  return (
    <NotificationHistoryContext.Provider value={historyValue}>
      {children}
    </NotificationHistoryContext.Provider>
  );
};

export const useNotificationHistory = () => {
  const context = useContext(NotificationHistoryContext);
  if (!context) {
    throw new Error(
      'useNotificationHistory phải được dùng bên trong NotificationProvider'
    );
  }
  return context;
};
