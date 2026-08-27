import { useEffect, useRef, useState } from 'react';
import { uiConfig } from '../../config/uiConfig';
import { useNotificationHistory } from '../../context/NotificationContext';
import { formatRelativeDate } from '../../utils';
import './NotificationBell.css';

const NotificationBell = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    markAsRead,
  } = useNotificationHistory();
  const [isOpen, setIsOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number>(
    uiConfig.notification.visibleStep
  );
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setVisibleCount(uiConfig.notification.visibleStep);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [isOpen]);

  const toggle = () => {
    if (isOpen) setVisibleCount(uiConfig.notification.visibleStep);
    setIsOpen((current) => !current);
  };

  const showMore = async () => {
    const nextVisibleCount = visibleCount + uiConfig.notification.visibleStep;
    if (nextVisibleCount > notifications.length && hasMore) {
      try {
        await loadMore();
      } catch {
        return;
      }
    }
    setVisibleCount(nextVisibleCount);
  };

  const visibleNotifications = notifications.slice(0, visibleCount);
  const canShowMore = visibleCount < notifications.length || hasMore;

  return (
    <div className="notification-bell" ref={rootRef}>
      <button
        type="button"
        className={`notification-bell-button${isOpen ? ' active' : ''}`}
        aria-label="Thông báo"
        aria-expanded={isOpen}
        onClick={toggle}
      >
        <i className="bi bi-bell" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <section className="notification-dropdown" aria-label="Lịch sử thông báo">
          <header className="notification-dropdown-header">
            <div>
              <strong>Thông báo</strong>
              {unreadCount > 0 && <span>{unreadCount} chưa đọc</span>}
            </div>
          </header>

          <div className="notification-list">
            {isLoading && notifications.length === 0 ? (
              <div className="notification-empty">Đang tải thông báo...</div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <i className="bi bi-bell-slash" />
                <span>Bạn chưa có thông báo nào.</span>
              </div>
            ) : visibleNotifications.map((notification) => (
              <button
                type="button"
                key={notification.id}
                className={`notification-item${notification.readAt ? '' : ' unread'}`}
                onClick={() => void markAsRead(notification.id)}
              >
                <span className="notification-item-body">
                  <span className="notification-item-heading">
                    <strong>{notification.title}</strong>
                  </span>
                  <span className="notification-item-content">{notification.content}</span>
                  <span className="notification-item-meta">
                    {formatRelativeDate(notification.createdAt)}
                  </span>
                </span>
              </button>
            ))}

            {notifications.length > 0 && canShowMore && (
              <div className="notification-show-more">
                <button
                  type="button"
                  disabled={isLoadingMore}
                  onClick={() => void showMore()}
                >
                  {isLoadingMore ? 'Đang tải...' : 'Xem thêm'}
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default NotificationBell;
