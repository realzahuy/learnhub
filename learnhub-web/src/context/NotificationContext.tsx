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
import { matchPath, useLocation } from 'react-router-dom';
import { uiConfig } from '../config/uiConfig';
import {
  NotificationCursor,
  notificationService,
} from '../services/api/notification.service';
import { ROLE_INSTRUCTOR } from '../types/auth.types';
import { AppNotification } from '../types/notification.types';
import { CourseStatusChangedEvent } from '../types/realtime.types';
import { ROUTE_MATCH_PATTERNS } from '../routes/paths';
import { useAuth } from './AuthContext';

interface NotificationHistoryContextType {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
}

interface CourseRealtimeContextType {
  lastCourseStatusEvent: CourseStatusChangedEvent | null;
  realtimeReconnectVersion: number;
}

const NotificationHistoryContext = createContext<NotificationHistoryContextType | undefined>(
  undefined
);
const CourseRealtimeContext = createContext<CourseRealtimeContextType | undefined>(undefined);

const waitBeforeReconnect = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, roles } = useAuth();
  const { pathname } = useLocation();
  const isInstructorMode = Boolean(
    matchPath(ROUTE_MATCH_PATTERNS.instructorArea, pathname)
  );
  const shouldReceiveNotificationHistory =
    isAuthenticated && isInstructorMode && roles.includes(ROLE_INSTRUCTOR);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastCourseStatusEvent, setLastCourseStatusEvent] =
    useState<CourseStatusChangedEvent | null>(null);
  const [realtimeReconnectVersion, setRealtimeReconnectVersion] = useState(0);

  const reconnectPending = useRef(false);
  const knownIds = useRef(new Set<number>());
  const nextCursor = useRef<NotificationCursor | null>(null);
  const loadingMore = useRef(false);
  const historyController = useRef<AbortController | null>(null);
  const notificationHistoryEnabled = useRef(shouldReceiveNotificationHistory);
  notificationHistoryEnabled.current = shouldReceiveNotificationHistory;

  const resetHistory = useCallback(() => {
    knownIds.current.clear();
    nextCursor.current = null;
    loadingMore.current = false;
    setNotifications([]);
    setUnreadCount(0);
    setIsLoading(false);
    setIsLoadingMore(false);
    setHasMore(false);
  }, []);

  const refreshHistory = useCallback(async (signal?: AbortSignal) => {
    if (!notificationHistoryEnabled.current || signal?.aborted) return;
    setIsLoading(true);
    try {
      const history = await notificationService.list(
        null,
        uiConfig.pagination.notificationHistoryPageSize,
        signal
      );
      if (!notificationHistoryEnabled.current || signal?.aborted) return;
      knownIds.current = new Set(history.content.map((item) => item.id));
      nextCursor.current = history.nextCursorCreatedAt && history.nextCursorId
        ? { createdAt: history.nextCursorCreatedAt, id: history.nextCursorId }
        : null;
      setNotifications(history.content);
      setUnreadCount(history.unreadCount);
      setHasMore(!history.last);
    } finally {
      if (notificationHistoryEnabled.current && !signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!notificationHistoryEnabled.current || !hasMore || loadingMore.current) return;

    const signal = historyController.current?.signal;
    if (!signal || signal.aborted) return;

    loadingMore.current = true;
    setIsLoadingMore(true);
    try {
      const history = await notificationService.list(
        nextCursor.current,
        uiConfig.pagination.notificationHistoryPageSize,
        signal
      );
      if (!notificationHistoryEnabled.current || signal.aborted) return;
      nextCursor.current = history.nextCursorCreatedAt && history.nextCursorId
        ? { createdAt: history.nextCursorCreatedAt, id: history.nextCursorId }
        : null;
      setHasMore(!history.last);
      setNotifications((current) => {
        const additions = history.content.filter((item) => !knownIds.current.has(item.id));
        additions.forEach((item) => knownIds.current.add(item.id));
        return [...current, ...additions];
      });
    } catch (error) {
      if (!signal.aborted) {
        console.error('Không thể tải thêm thông báo:', error);
      }
    } finally {
      loadingMore.current = false;
      if (notificationHistoryEnabled.current && !signal.aborted) {
        setIsLoadingMore(false);
      }
    }
  }, [hasMore]);

  const receiveNotification = useCallback((notification: AppNotification) => {
    if (knownIds.current.has(notification.id)) return;
    knownIds.current.add(notification.id);
    setNotifications((current) => [notification, ...current]);
    if (!notification.readAt) {
      setUnreadCount((current) => current + 1);
    }
  }, []);

  useEffect(() => {
    historyController.current?.abort();
    historyController.current = null;

    if (!shouldReceiveNotificationHistory) {
      resetHistory();
      return;
    }

    const controller = new AbortController();
    historyController.current = controller;
    void refreshHistory(controller.signal).catch((error) => {
      if (!controller.signal.aborted) {
        console.error('Không thể tải lịch sử thông báo:', error);
      }
    });

    return () => {
      controller.abort();
      if (historyController.current === controller) {
        historyController.current = null;
      }
    };
  }, [refreshHistory, resetHistory, shouldReceiveNotificationHistory]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLastCourseStatusEvent(null);
      setRealtimeReconnectVersion(0);
      reconnectPending.current = false;
      return;
    }

    const controller = new AbortController();
    let disposed = false;

    const connect = async () => {
      let retryDelay: number = uiConfig.notification.sseReconnectInitialMs;
      while (!disposed && !controller.signal.aborted) {
        try {
          await notificationService.stream(
            {
              onConnected: () => {
                if (!reconnectPending.current) return;
                reconnectPending.current = false;
                setRealtimeReconnectVersion((version) => version + 1);
              },
              onNotification: (notification) => {
                if (notificationHistoryEnabled.current) {
                  receiveNotification(notification);
                }
              },
              onCourseStatusChanged: setLastCourseStatusEvent,
            },
            controller.signal
          );
          retryDelay = uiConfig.notification.sseReconnectInitialMs;
        } catch (error) {
          if (controller.signal.aborted || disposed) break;
          console.error('Kết nối thông báo realtime bị gián đoạn:', error);
        }

        if (!disposed && !controller.signal.aborted) {
          reconnectPending.current = true;
          if (notificationHistoryEnabled.current) {
            try {
              await refreshHistory(controller.signal);
            } catch (error) {
              if (!controller.signal.aborted) {
                console.error('Không thể đồng bộ lại thông báo:', error);
              }
            }
          }
          await waitBeforeReconnect(retryDelay);
          retryDelay = Math.min(
            retryDelay * 2,
            uiConfig.notification.sseReconnectMaxMs
          );
        }
      }
    };

    void connect();
    return () => {
      disposed = true;
      controller.abort();
    };
  }, [isAuthenticated, receiveNotification, refreshHistory]);

  const markAsRead = useCallback(async (id: number) => {
    const current = notifications.find((item) => item.id === id);
    if (!current || current.readAt) return;

    const updated = await notificationService.markAsRead(id);
    setNotifications((items) => items.map((item) => (item.id === id ? updated : item)));
    setUnreadCount((count) => Math.max(0, count - 1));
  }, [notifications]);

  const historyValue = useMemo<NotificationHistoryContextType>(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      isLoadingMore,
      hasMore,
      loadMore,
      markAsRead,
    }),
    [
      notifications,
      unreadCount,
      isLoading,
      isLoadingMore,
      hasMore,
      loadMore,
      markAsRead,
    ]
  );
  const courseRealtimeValue = useMemo<CourseRealtimeContextType>(
    () => ({ lastCourseStatusEvent, realtimeReconnectVersion }),
    [lastCourseStatusEvent, realtimeReconnectVersion]
  );

  return (
    <CourseRealtimeContext.Provider value={courseRealtimeValue}>
      <NotificationHistoryContext.Provider value={historyValue}>
        {children}
      </NotificationHistoryContext.Provider>
    </CourseRealtimeContext.Provider>
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

export const useCourseRealtime = () => {
  const context = useContext(CourseRealtimeContext);
  if (!context) {
    throw new Error('useCourseRealtime phải được dùng bên trong NotificationProvider');
  }
  return context;
};
