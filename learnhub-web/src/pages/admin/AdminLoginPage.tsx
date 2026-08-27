import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import PasswordInput from '../../components/auth/PasswordInput';
import { useAuth } from '../../context/AuthContext';
import { ROLE_ADMIN } from '../../types/auth.types';
import { getApiErrorMessage } from '../../utils';
import './AdminLoginPage.css';
import { ROUTE_PATHS } from '../../routes/paths';

const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, logout, isAuthenticated, isLoading: isAuthLoading, roles } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const tokenRoles = await login(username.trim(), password);

      if (!tokenRoles.includes(ROLE_ADMIN)) {

        await logout();
        setError('Tài khoản này không có quyền quản trị');
        return;
      }

      navigate(ROUTE_PATHS.adminCourses, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Đăng nhập thất bại. Vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthLoading && isAuthenticated && roles.includes(ROLE_ADMIN)) {
    return <Navigate to={ROUTE_PATHS.adminCourses} replace />;
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-brand">
          <span className="text-notion">learn</span>
          <span className="text-dark">hub</span>
        </div>

        <h1 className="admin-login-title">Đăng nhập quản trị</h1>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <input
              id="admin-username"
              type="text"
              className="form-control"
              placeholder="Tên đăng nhập hoặc email"
              aria-label="Tên đăng nhập hoặc email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={submitting}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="mb-4">
            <PasswordInput
              placeholder="Mật khẩu"
              value={password}
              onChange={setPassword}
              disabled={submitting}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn-admin-login" disabled={submitting}>
            {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <Link to={ROUTE_PATHS.adminForgotPassword} className="admin-login-forgot">
          Quên mật khẩu?
        </Link>

        <Link to={ROUTE_PATHS.home} className="admin-login-back" title="Về trang chủ" aria-label="Về trang chủ">
          <i className="bi bi-arrow-left"></i>
        </Link>
      </div>
    </div>
  );
};

export default AdminLoginPage;
