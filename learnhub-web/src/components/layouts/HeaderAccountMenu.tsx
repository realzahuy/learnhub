import { RefObject } from 'react';
import { Link } from 'react-router-dom';
import { AuthenticatedUser } from '../../types/auth.types';
import UserAvatar from '../common/UserAvatar';
import { ROUTE_PATHS } from '../../routes/paths';

export const DesktopAccountMenu = ({
  user,
  isOpen,
  rootRef,
  onToggle,
  onClose,
  onLogout,
}: {
  user: AuthenticatedUser;
  isOpen: boolean;
  rootRef: RefObject<HTMLDivElement | null>;
  onToggle: () => void;
  onClose: () => void;
  onLogout: () => void;
}) => (
  <div className="dropdown" ref={rootRef}>
    <button
      className="account-menu-button dropdown-toggle-no-caret"
      type="button"
      onClick={onToggle}
      aria-haspopup="menu"
      aria-expanded={isOpen}
    >
      <div className="account-menu-trigger d-flex align-items-center">
        <UserAvatar
          avatar={user.avatar}
          fullName={user.fullName}
          size="sm"
          className="header-account-avatar"
        />
        <span className="account-menu-name fw-semibold">{user.fullName}</span>
      </div>
    </button>
    {isOpen && (
      <div
        className="dropdown-menu dropdown-menu-end show account-dropdown-menu"
        style={{ position: 'absolute', right: 0 }}
        role="menu"
      >
        <Link className="dropdown-item" to={ROUTE_PATHS.profile} role="menuitem" onClick={onClose}>
          <i className="bi bi-person me-2" />Thông tin cá nhân
        </Link>
        <hr className="dropdown-divider" />
        <button className="dropdown-item text-danger" onClick={onLogout} role="menuitem">
          <i className="bi bi-box-arrow-right me-2" />Đăng xuất
        </button>
      </div>
    )}
  </div>
);

export const MobileAccountMenu = ({
  user,
  isOpen,
  onToggle,
  onClose,
  onLogout,
}: {
  user: AuthenticatedUser;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onLogout: () => void;
}) => (
  <div className="mobile-user-section">
    <button
      className="mobile-menu-item border-0 bg-transparent w-100 text-start d-flex align-items-center gap-2"
      onClick={onToggle}
    >
      <UserAvatar
        avatar={user.avatar}
        fullName={user.fullName}
        size="sm"
        className="header-account-avatar"
      />
      <span>{user.fullName}</span>
    </button>
    {isOpen && (
      <div className="mobile-user-dropdown">
        <Link to={ROUTE_PATHS.profile} className="mobile-menu-item ps-4" onClick={onClose}>
          <i className="bi bi-person me-2" />Thông tin cá nhân
        </Link>
        <button className="mobile-menu-item text-danger border-0 bg-transparent w-100 text-start ps-4" onClick={onLogout}>
          <i className="bi bi-box-arrow-right me-2" />Đăng xuất
        </button>
      </div>
    )}
  </div>
);
