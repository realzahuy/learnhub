import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import PasswordInput from '../../components/auth/PasswordInput';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage } from '../../utils';
import { ROUTE_PATHS } from '../../routes/paths';
import './AuthPage.css';

const LoginPage = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as {
    from?: string;
    registeredUsername?: string;
    authError?: string;
  } | null;

  const from = state?.from;
  const redirectTo =
    from && from !== ROUTE_PATHS.home && from !== ROUTE_PATHS.homeAlias
      ? from
      : ROUTE_PATHS.courses;

  const [form, setForm] = useState({ login: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(state?.authError ?? null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {

    localStorage.removeItem('rememberMe');

    if (state?.registeredUsername) {
      setForm((prev) => ({ ...prev, login: state.registeredUsername as string }));
      return;
    }

    const savedLogin = localStorage.getItem('savedLogin');
    if (savedLogin) {
      setForm((prev) => ({ ...prev, login: savedLogin }));
      setRememberMe(true);
    }

  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);
      setSubmitting(true);

      try {
        await login(form.login, form.password);

        if (rememberMe) {
          localStorage.setItem('savedLogin', form.login);
        } else {
          localStorage.removeItem('savedLogin');
        }

        navigate(redirectTo, { replace: true });
      } catch (err) {
        console.error('Lỗi đăng nhập:', err);
        setError(getApiErrorMessage(err, 'Đã có lỗi xảy ra. Vui lòng thử lại.'));
        setSubmitting(false);
      }
    },
    [form, rememberMe, login, navigate, redirectTo]
  );

  if (isAuthenticated) return <Navigate to={redirectTo} replace />;

  return (
    <div className="auth-page">

      <main className="auth-page-main">
        <div className="auth-card">
          <h1 className="auth-card-title">Chào mừng trở lại!</h1>

          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            <div className="mb-3">
              <input
                type="text"
                className="form-control form-control-lg"
                placeholder="Tên đăng nhập hoặc Email"
                aria-label="Tên đăng nhập hoặc Email"
                value={form.login}
                onChange={(e) => setForm({ ...form, login: e.target.value })}
                disabled={submitting}
                autoComplete="username"
              />
            </div>

            <div className="mb-3">
              <PasswordInput
                placeholder="Mật khẩu"
                value={form.password}
                onChange={(password) => setForm({ ...form, password })}
                disabled={submitting}
                autoComplete="current-password"
              />
            </div>

            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={submitting}
                />
                <label className="form-check-label" htmlFor="rememberMe">
                  Nhớ tên đăng nhập
                </label>
              </div>

              { }
              <Link to={ROUTE_PATHS.forgotPassword} className="auth-forgot">
                Quên mật khẩu?
              </Link>
            </div>

            <button type="submit" className="auth-login-button" disabled={submitting}>
              {submitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Đang đăng nhập...
                </>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

          <p className="auth-switch">
            Chưa có tài khoản? <Link to={ROUTE_PATHS.register}>Đăng ký ngay</Link>
          </p>
        </div>
      </main>

    </div>
  );
};

export default LoginPage;
