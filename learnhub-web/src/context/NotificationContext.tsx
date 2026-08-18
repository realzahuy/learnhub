import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import {
  NotificationCursor,
  notificationService,
} from '../services/api/notification.service';
import { ROLE_INSTRUCTOR } from '../types/auth.types';
import { AppNotification } from '../types/notification.types';
import { CourseStatusChangedEvent } from '../types/realtime.types';
import { ROUTE_MATCH_PATTERNS } from '../routes/paths';
import { useAuth } from './AuthContext';

const HISTORY_PAGE_SIZE = 12;

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  lastCourseStatusEvent: CourseStatusChangedEvent | null;
  realtimeReconnectVersion: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const waitBeforeReconnect = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, roles } = useAuth();
  const { pathname } = useLocation();
  const isInstructorMode = Boolean(
    matchPath(ROUTE_MATCH_PATTERNS.instructorArea, pathname)
  );
  const shouldReceiveNotifications =
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
  const connectionController = useRef<AbortController | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!shouldReceiveNotifications || signal?.aborted) return;
    setIsLoading(true);
    try {
      const history = await notificationService.list(null, HISTORY_PAGE_SIZE, signal);
      if (signal?.aborted) return;
      knownIds.current = new Set(history.content.map((item) => item.id));
      nextCursor.current = history.nextCursorCreatedAt && history.nextCursorId
        ? { createdAt: history.nextCursorCreatedAt, id: history.nextCursorId }
        : null;
      setNotifications(history.content);
      setUnreadCount(history.unreadCount);
      setHasMore(!history.last);
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [shouldReceiveNotifications]);

  const loadMore = useCallback(async () => {
    if (!shouldReceiveNotifications || !hasMore || loadingMore.current) return;

    const signal = connectionController.current?.signal;
    if (!signal || signal.aborted) return;

    loadingMore.current = true;
    setIsLoadingMore(true);
    try {
      const history = await notificationService.list(
        nextCursor.current,
        HISTORY_PAGE_SIZE,
        signal
      );
      if (signal?.aborted) return;
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
      if (!signal?.aborted) {
        console.error('Không thể tải thêm thông báo:', error);
      }
    } finally {
      loadingMore.current = false;
      if (!signal?.aborted) setIsLoadingMore(false);
    }
  }, [hasMore, shouldReceiveNotifications]);

  const receiveNotification = useCallback((notification: AppNotification) => {
    if (knownIds.current.has(notification.id)) return;
    knownIds.current.add(notification.id);
    setNotifications((current) => [notification, ...current]);
    if (!notification.readAt) {
      setUnreadCount((current) => current + 1);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      knownIds.current.clear();
      nextCursor.current = null;
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      setIsLoadingMore(false);
      setHasMore(false);
      setLastCourseStatusEvent(null);
      setRealtimeReconnectVersion(0);
      reconnectPending.current = false;
      return;
    }

    if (!shouldReceiveNotifications) {
      knownIds.current.clear();
      nextCursor.current = null;
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      setIsLoadingMore(false);
      setHasMore(false);
    }

    const controller = new AbortController();
    connectionController.current = controller;
    let disposed = false;

    const connect = async () => {
      if (shouldReceiveNotifications) {
        try {
          await refresh(controller.signal);
        } catch (error) {
          if (!controller.signal.aborted) {
            console.error('Không thể tải lịch sử thông báo:', error);
          }
        }
      }

      let retryDelay = 1000;
      while (!disposed && !controller.signal.aborted) {
        try {
          await notificationService.stream(
            {
              onConnected: () => {
                if (!reconnectPending.current) return;
                reconnectPending.current = false;
                setRealtimeReconnectVersion((version) => version + 1);
              },
              onNotification: shouldReceiveNotifications ? receiveNotification : undefined,
              onCourseStatusChanged: setLastCourseStatusEvent,
            },
            controller.signal
          );
          retryDelay = 1000;
        } catch (error) {
          if (controller.signal.aborted || disposed) break;
          console.error('Kết nối thông báo realtime bị gián đoạn:', error);
        }

        if (!disposed && !controller.signal.aborted) {
          reconnectPending.current = true;
          if (shouldReceiveNotifications) {
            try {
              await refresh(controller.signal);
            } catch (error) {
              if (!controller.signal.aborted) {
                console.error('Không thể đồng bộ lại thông báo:', error);
              }
            }
          }
          await waitBeforeReconnect(retryDelay);
          retryDelay = Math.min(retryDelay * 2, 30_000);
        }
      }
    };

    void connect();
    return () => {
      disposed = true;
      controller.abort();
      if (connectionController.current === controller) {
        connectionController.current = null;
      }
    };
  }, [isAuthenticated, shouldReceiveNotifications, receiveNotification, refresh]);

  const markAsRead = useCallback(async (id: number) => {
    const current = notifications.find((item) => item.id === id);
    if (!current || current.readAt) return;

    const updated = await notificationService.markAsRead(id);
    setNotifications((items) => items.map((item) => (item.id === id ? updated : item)));
    setUnreadCount((count) => Math.max(0, count - 1));
  }, [notifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        isLoadingMore,
        hasMore,
        loadMore,
        markAsRead,
        lastCourseStatusEvent,
        realtimeReconnectVersion,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications phải được dùng bên trong NotificationProvider');
  }
  return context;
};
