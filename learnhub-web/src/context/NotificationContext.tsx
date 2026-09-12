import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { uiConfig } from '../config/uiConfig';
import { notificationService } from '../services/api/notification.service';
import { AppNotification } from '../types/notification.types';
import { CourseStatusChangedEvent } from '../types/realtime.types';
import { useAuth } from './AuthContext';

interface NotificationHistoryHandlers {
  onNotification: (notification: AppNotification) => void;
  refresh: () => Promise<void>;
}

interface CourseRealtimeContextType {
  lastCourseStatusEvent: CourseStatusChangedEvent | null;
  realtimeReconnectVersion: number;
  registerNotificationHistory: (handlers: NotificationHistoryHandlers) => () => void;
}

const CourseRealtimeContext = createContext<CourseRealtimeContextType | undefined>(undefined);
const waitBeforeReconnect = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { userId, roles } = useAuth();
  const rolesKey = roles.join('|');
  const [lastCourseStatusEvent, setLastCourseStatusEvent] = useState<CourseStatusChangedEvent | null>(null);
  const [realtimeReconnectVersion, setRealtimeReconnectVersion] = useState(0);
  const reconnectPending = useRef(false);
  const historyHandlers = useRef<NotificationHistoryHandlers | null>(null);
  const registerNotificationHistory = useCallback((handlers: NotificationHistoryHandlers) => {
    historyHandlers.current = handlers;
    return () => { historyHandlers.current = null; };
  }, []);

  useEffect(() => {
    setLastCourseStatusEvent(null);
    setRealtimeReconnectVersion(0);
    reconnectPending.current = false;
    if (userId === null) return;

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
                historyHandlers.current?.onNotification(notification);
              },
              onCourseStatusChanged: setLastCourseStatusEvent,
            },
            controller.signal
          );
          retryDelay = uiConfig.notification.sseReconnectInitialMs;
        } catch {
          if (controller.signal.aborted || disposed) break;
        }

        if (!disposed && !controller.signal.aborted) {
          reconnectPending.current = true;
          if (historyHandlers.current) {
            try {
              await historyHandlers.current.refresh();
            } catch {}
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
  }, [userId, rolesKey]);

  const value = useMemo(() => ({
    lastCourseStatusEvent, realtimeReconnectVersion, registerNotificationHistory,
  }), [lastCourseStatusEvent, realtimeReconnectVersion, registerNotificationHistory]);

  return <CourseRealtimeContext.Provider value={value}>{children}</CourseRealtimeContext.Provider>;
};

export const useCourseRealtime = () => {
  const context = useContext(CourseRealtimeContext);
  if (!context) {
    throw new Error('useCourseRealtime phải được dùng bên trong NotificationProvider');
  }
  return context;
};
