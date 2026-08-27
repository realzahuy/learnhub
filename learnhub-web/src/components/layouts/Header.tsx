import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link, matchPath, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { uiConfig } from '../../config/uiConfig';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { ROLE_INSTRUCTOR } from '../../types/auth.types';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import LogoutConfirmDialog from '../common/LogoutConfirmDialog';
import HeaderSearch from './HeaderSearch';
import { DesktopAccountMenu } from './HeaderAccountMenu';
import HeaderMobileMenu from './HeaderMobileMenu';
import NotificationBell from './NotificationBell';
import { ROUTE_MATCH_PATTERNS, ROUTE_PATHS } from '../../routes/paths';
import './Header.css';

const CartIcon: React.FC = () => (
  <i className="bi bi-bag cart-icon" aria-hidden="true" />
);

const DESKTOP_VIEWPORT_QUERY = '(min-width: 992px)';

const getIsDesktopViewport = () =>
  typeof window === 'undefined' || typeof window.matchMedia !== 'function'
    ? true
    : window.matchMedia(DESKTOP_VIEWPORT_QUERY).matches;

const useIsDesktopViewport = () => {
  const [isDesktop, setIsDesktop] = useState(getIsDesktopViewport);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia(DESKTOP_VIEWPORT_QUERY);
    const updateViewport = () => setIsDesktop(mediaQuery.matches);
    updateViewport();
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateViewport);
      return () => mediaQuery.removeEventListener('change', updateViewport);
    }
    mediaQuery.addListener(updateViewport);
    return () => mediaQuery.removeListener(updateViewport);
  }, []);

  return isDesktop;
};

const Header: React.FC = () => {
  const { user, isAuthenticated, logout, roles } = useAuth();
  const { cartCount } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const goToLogin = useCallback(() => {
    navigate(ROUTE_PATHS.login, { state: { from: location.pathname + location.search } });
  }, [navigate, location.pathname, location.search]);

  const isInstructor = roles.includes(ROLE_INSTRUCTOR);

  const isInstructorMode = Boolean(
    matchPath(ROUTE_MATCH_PATTERNS.instructorArea, location.pathname)
  );
  const isLearningMode = Boolean(
    matchPath(ROUTE_MATCH_PATTERNS.learningArea, location.pathname)
  );
  const isDesktopViewport = useIsDesktopViewport();
  const isCatalogMode = Boolean(
    matchPath(ROUTE_MATCH_PATTERNS.coursesArea, location.pathname)
  ) && !isLearningMode;
  const [searchQuery, setSearchQuery] = useState(
    () => location.pathname === ROUTE_PATHS.courses
      ? new URLSearchParams(location.search).get('search') ?? ''
      : ''
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileUserMenu, setShowMobileUserMenu] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchQuery(
      location.pathname === ROUTE_PATHS.courses
        ? new URLSearchParams(location.search).get('search') ?? ''
        : ''
    );
    setShowDropdown(false);
    setShowMobileUserMenu(false);
  }, [location.pathname, location.search]);

  const goToSearch = useCallback(
    (value: string) => {
      const keyword = value.trim();
      if (location.pathname === ROUTE_PATHS.courses) {
        const next = new URLSearchParams(location.search);
        if (keyword) next.set('search', keyword);
        else next.delete('search');
        next.set('page', '0');
        navigate(`${ROUTE_PATHS.courses}?${next.toString()}`);
        return;
      }
      navigate(
        keyword
          ? `${ROUTE_PATHS.courses}?search=${encodeURIComponent(keyword)}`
          : ROUTE_PATHS.courses
      );
    },
    [location.pathname, location.search, navigate]
  );

  const [debouncedGoToSearch, cancelPendingSearch] = useDebouncedCallback(
    goToSearch,
    uiConfig.timing.searchDebounceMs
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchQuery(value);

      debouncedGoToSearch(value);
    },
    [debouncedGoToSearch]
  );

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      cancelPendingSearch();
      goToSearch(searchQuery);
    },
    [cancelPendingSearch, goToSearch, searchQuery]
  );

  const requestLogout = useCallback(() => {
    setShowDropdown(false);
    setShowMobileMenu(false);
    setShowMobileUserMenu(false);
    setConfirmLogout(true);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setShowMobileMenu((open) => !open);
    setShowMobileUserMenu(false);
  }, []);

  const handleLogout = useCallback(async () => {
    setConfirmLogout(false);
    await logout();
  }, [logout]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;

        if (!target.closest('.navbar-toggler')) {
          setShowMobileMenu(false);
          setShowMobileUserMenu(false);
        }
      }
    };

    if (showMobileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMobileMenu]);

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom shadow-sm">
      <div className="container-fluid px-4">
        <Link
          className="navbar-brand fw-bold logo-hover"
          to={isInstructorMode ? ROUTE_PATHS.instructorCourses : ROUTE_PATHS.home}
        >
          <span className="text-notion">learn</span>
          <span className="text-dark">hub</span>
        </Link>

        <div className="d-flex d-lg-none align-items-center gap-2 ms-auto">
          {isAuthenticated && isInstructorMode && !isDesktopViewport && <NotificationBell />}
          <button
            className={`navbar-toggler user-menu-toggle${showMobileMenu ? ' is-open' : ''}`}
            type="button"
            onClick={toggleMobileMenu}
            aria-label={showMobileMenu ? 'Đóng menu' : 'Mở menu'}
            aria-controls="user-mobile-menu"
            aria-expanded={showMobileMenu}
          >
            <i className="bi bi-list user-menu-toggle-icon" aria-hidden="true"></i>
          </button>
        </div>

        <div className="d-none d-lg-block ms-3">
          {isInstructorMode ? (

            <>
              <NavLink
                to={ROUTE_PATHS.instructorCourses}
                className="nav-link d-inline-block fw-semibold nav-link-hover"
              >
                Quản lý khóa học
              </NavLink>
              <NavLink
                to={ROUTE_PATHS.instructorStats}
                className="nav-link d-inline-block fw-semibold nav-link-hover ms-3"
              >
                Thống kê
              </NavLink>
            </>
          ) : (
            <NavLink
              to={ROUTE_PATHS.courses}
              end
              className={`nav-link d-inline-block fw-semibold nav-link-hover${
                isCatalogMode ? ' active' : ''
              }`}
              aria-current={isCatalogMode ? 'page' : undefined}
            >
              Khóa học
            </NavLink>
          )}
        </div>

        {!isInstructorMode && (
          <HeaderSearch
            value={searchQuery}
            onChange={handleSearchChange}
            onSubmit={handleSearchSubmit}
          />
        )}

        <div
          className={`header-actions d-none d-lg-flex align-items-center ${
            isInstructorMode ? 'ms-auto' : ''
          }`}
        >
          {isAuthenticated &&
            (isInstructorMode ? (

              <NavLink to={ROUTE_PATHS.courses} className="nav-link fw-semibold nav-link-hover">
                Học viên
              </NavLink>
            ) : (
              <>
                {isInstructor && (
                  <NavLink to={ROUTE_PATHS.instructorCourses} className="nav-link fw-semibold nav-link-hover">
                    Giảng viên
                  </NavLink>
                )}
                <NavLink
                  to={ROUTE_PATHS.myCourses}
                  className={({ isActive }) =>
                    `nav-link fw-semibold nav-link-hover${
                      isActive ? ' active' : ''
                    }`
                  }
                >
                  Khóa học của tôi
                </NavLink>
              </>
            ))}

          {isAuthenticated && isInstructorMode && isDesktopViewport && <NotificationBell />}

          {!isInstructorMode && (
            <NavLink
              to={ROUTE_PATHS.cart}
              className="btn btn-link text-dark cart-hover position-relative cart-link"
              aria-label="Giỏ hàng"
            >
              <CartIcon />
              {cartCount > 0 && (
                <span className="cart-badge">{cartCount > 99 ? '99+' : cartCount}</span>
              )}
            </NavLink>
          )}

          {isAuthenticated && user ? (
            <DesktopAccountMenu
              user={user}
              isOpen={showDropdown}
              rootRef={dropdownRef}
              onToggle={() => setShowDropdown((current) => !current)}
              onClose={() => setShowDropdown(false)}
              onLogout={requestLogout}
            />
          ) : (

            <div className="d-flex align-items-center gap-2">
              <button className="header-login-button" onClick={goToLogin} type="button">
                Đăng nhập
              </button>
              <Link
                to={ROUTE_PATHS.adminLogin}
                className="admin-gear-link"
                title="Đăng nhập quản trị"
                aria-label="Đăng nhập quản trị"
              >
                <i className="bi bi-gear"></i>
              </Link>
            </div>
          )}
        </div>
      </div>

      {showMobileMenu && (
        <HeaderMobileMenu
          rootRef={mobileMenuRef}
          isInstructorMode={isInstructorMode}
          isCatalogMode={isCatalogMode}
          isAuthenticated={isAuthenticated}
          isInstructor={isInstructor}
          user={user}
          cartCount={cartCount}
          searchQuery={searchQuery}
          isUserMenuOpen={showMobileUserMenu}
          onSearchChange={handleSearchChange}
          onSearchSubmit={handleSearchSubmit}
          onClose={() => {
            setShowMobileMenu(false);
            setShowMobileUserMenu(false);
          }}
          onToggleUserMenu={() => setShowMobileUserMenu((current) => !current)}
          onLogin={() => {
            goToLogin();
            setShowMobileMenu(false);
          }}
          onLogout={requestLogout}
        />
      )}

      <LogoutConfirmDialog
        isOpen={confirmLogout}
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </nav>
  );
};

export default Header;
