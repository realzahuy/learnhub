import { ChangeEventHandler, FormEventHandler, RefObject } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { AuthenticatedUser } from '../../types/auth.types';
import { MobileAccountMenu } from './HeaderAccountMenu';
import HeaderSearch from './HeaderSearch';
import { ROUTE_PATHS } from '../../routes/paths';

interface HeaderMobileMenuProps {
  rootRef: RefObject<HTMLDivElement | null>;
  isInstructorMode: boolean;
  isCatalogMode: boolean;
  isAuthenticated: boolean;
  isInstructor: boolean;
  user: AuthenticatedUser | null;
  cartCount: number;
  searchQuery: string;
  isUserMenuOpen: boolean;
  onSearchChange: ChangeEventHandler<HTMLInputElement>;
  onSearchSubmit: FormEventHandler<HTMLFormElement>;
  onClose: () => void;
  onToggleUserMenu: () => void;
  onLogin: () => void;
  onLogout: () => void;
}

const HeaderMobileMenu = ({
  rootRef,
  isInstructorMode,
  isCatalogMode,
  isAuthenticated,
  isInstructor,
  user,
  cartCount,
  searchQuery,
  isUserMenuOpen,
  onSearchChange,
  onSearchSubmit,
  onClose,
  onToggleUserMenu,
  onLogin,
  onLogout,
}: HeaderMobileMenuProps) => (
  <div
    id="user-mobile-menu"
    ref={rootRef}
    className="mobile-menu show"
    aria-hidden="false"
  >
    <div className="mobile-menu-header">
      <button
        type="button"
        className="user-menu-toggle is-open"
        onClick={onClose}
        aria-label="Đóng menu"
        aria-controls="user-mobile-menu"
        aria-expanded="true"
      >
        <i className="bi bi-list user-menu-toggle-icon" aria-hidden="true"></i>
      </button>
    </div>
    <div className="mobile-menu-content">
      {!isInstructorMode && (
        <HeaderSearch mobile value={searchQuery} onChange={onSearchChange} onSubmit={onSearchSubmit} />
      )}
      {isInstructorMode ? (
        <>
          <NavLink to={ROUTE_PATHS.instructorCourses} className="mobile-menu-item" onClick={onClose}>Quản lý khóa học</NavLink>
          <NavLink to={ROUTE_PATHS.instructorStats} className="mobile-menu-item" onClick={onClose}>Thống kê</NavLink>
        </>
      ) : (
        <NavLink
          to={ROUTE_PATHS.courses}
          end
          className={`mobile-menu-item${isCatalogMode ? ' active' : ''}`}
          aria-current={isCatalogMode ? 'page' : undefined}
          onClick={onClose}
        >Khóa học</NavLink>
      )}

      {isAuthenticated && (isInstructorMode ? (
        <NavLink to={ROUTE_PATHS.home} end className="mobile-menu-item" onClick={onClose}>Học viên</NavLink>
      ) : (
        <>
          {isInstructor && (
            <NavLink to={ROUTE_PATHS.instructorCourses} className="mobile-menu-item" onClick={onClose}>Giảng viên</NavLink>
          )}
          <NavLink
            to={ROUTE_PATHS.myCourses}
            className={({ isActive }) =>
              `mobile-menu-item${isActive ? ' active' : ''}`
            }
            onClick={onClose}
          >Khóa học của tôi</NavLink>
        </>
      ))}

      {!isInstructorMode && (
        <Link to={ROUTE_PATHS.cart} className="mobile-menu-item d-flex align-items-center justify-content-between" onClick={onClose}>
          <span>Giỏ hàng</span>
          {cartCount > 0 && <span className="cart-badge-inline">{cartCount > 99 ? '99+' : cartCount}</span>}
        </Link>
      )}

      {isAuthenticated && user ? (
        <MobileAccountMenu
          user={user}
          isOpen={isUserMenuOpen}
          onToggle={onToggleUserMenu}
          onClose={onClose}
          onLogout={onLogout}
        />
      ) : (
        <>
          <div className="d-flex gap-2 mt-3">
            <button className="header-login-button w-100" onClick={onLogin}>Đăng nhập</button>
          </div>
          <Link to={ROUTE_PATHS.adminLogin} className="mobile-menu-item mt-2" onClick={onClose}>
            <i className="bi bi-gear me-2" />Đăng nhập quản trị
          </Link>
        </>
      )}
    </div>
  </div>
);

export default HeaderMobileMenu;
