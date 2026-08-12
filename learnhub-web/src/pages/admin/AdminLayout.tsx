import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogoutConfirmDialog, UserAvatar } from '../../components/common';
import { Footer } from '../../components/layouts';

import './adminShared.css';
import './AdminLayout.css';
import { ROUTE_PATHS } from '../../routes/paths';

interface AdminNavItem {
  to: string;
  icon: string;
  label: string;
  end?: boolean;
}

const NAV_ITEMS: AdminNavItem[] = [

  { to: ROUTE_PATHS.adminCourses, icon: 'bi-mortarboard', label: 'Khóa học', end: true },
  { to: ROUTE_PATHS.adminCategories, icon: 'bi-tags', label: 'Danh mục', end: true },
  { to: ROUTE_PATHS.adminUsers, icon: 'bi-people', label: 'Người dùng', end: true },
  { to: ROUTE_PATHS.adminStats, icon: 'bi-bar-chart', label: 'Thống kê', end: true },
];

const DESKTOP_NAV_QUERY = '(min-width: 992px)';

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia(DESKTOP_NAV_QUERY).matches
  );

  useEffect(() => {
    const desktopQuery = window.matchMedia(DESKTOP_NAV_QUERY);
    const resetForBreakpoint = (event: MediaQueryListEvent) => setSidebarExpanded(event.matches);

    desktopQuery.addEventListener('change', resetForBreakpoint);
    return () => desktopQuery.removeEventListener('change', resetForBreakpoint);
  }, []);

  const collapseSidebarOnNarrowScreen = () => {
    if (!window.matchMedia(DESKTOP_NAV_QUERY).matches) setSidebarExpanded(false);
  };

  const handleLogout = async () => {
    setConfirmLogout(false);
    await logout();
    navigate(ROUTE_PATHS.adminLogin, { replace: true });
  };

  return (
    <div className="admin-shell">
      { }
      <div className="admin-main">
        <nav
          id="admin-navigation"
          className={`admin-nav${sidebarExpanded ? ' is-sidebar-expanded' : ''}`}
          aria-label="Điều hướng quản trị"
        >
          <div className="admin-nav-inner">
          <div className="admin-nav-brand">
            <button
              type="button"
              className="admin-nav-toggle"
              onClick={() => setSidebarExpanded((expanded) => !expanded)}
              aria-label={sidebarExpanded ? 'Thu gọn menu quản trị' : 'Mở rộng menu quản trị'}
              aria-expanded={sidebarExpanded}
              aria-controls="admin-navigation"
            >
              <i className="bi bi-list" aria-hidden="true"></i>
            </button>
            <span className="admin-nav-label">
              <span className="text-notion">learn</span>
              <span>hub</span>
            </span>
          </div>

          <div className="admin-nav-items">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className="admin-nav-link"
                title={item.label}
                onClick={collapseSidebarOnNarrowScreen}
              >
                <i className={`bi ${item.icon} admin-nav-icon`}></i>
                <span className="admin-nav-label">{item.label}</span>
              </NavLink>
            ))}
          </div>

          {
}
          <div className="admin-nav-footer">
            {user && (
              <NavLink
                to={ROUTE_PATHS.adminProfile}
                className="admin-nav-link admin-nav-user"
                title={user.fullName}
                onClick={collapseSidebarOnNarrowScreen}
              >
                <span className="admin-nav-icon admin-nav-avatar">
                  <UserAvatar avatar={user.avatar} fullName={user.fullName} size="sm" />
                </span>
                <span className="admin-nav-label admin-nav-user-name">{user.fullName}</span>
              </NavLink>
            )}

            <button
              type="button"
              className="admin-nav-link admin-nav-logout"
              onClick={() => {
                collapseSidebarOnNarrowScreen();
                setConfirmLogout(true);
              }}
              title="Đăng xuất"
            >
              <i className="bi bi-box-arrow-right admin-nav-icon"></i>
              <span className="admin-nav-label">Đăng xuất</span>
            </button>
          </div>
          </div>
        </nav>

        <main className="admin-content">
          <div className="admin-content-body"><Outlet /></div>
        </main>
      </div>

      { }
      <Footer />

      <LogoutConfirmDialog
        isOpen={confirmLogout}
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  );
};

export default AdminLayout;
