import { useCallback, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import PasswordInput from '../../components/auth/PasswordInput';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authService } from '../../services/api/auth.service';
import {
  EMAIL_MAX,
  FULL_NAME_MAX,
  PASSWORD_MAX,
  PASSWORD_MIN,
  USERNAME_MAX,
  USERNAME_MIN,
  getApiErrorMessage,
  getApiFieldErrors,
  validateRegisterForm,
} from '../../utils';
import type { RegisterFormErrors } from '../../utils';
import { ROUTE_PATHS } from '../../routes/paths';
import './AuthPage.css';

const EMPTY_FORM = {
  fullName: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const FIELD_BY_BACKEND_NAME: Record<string, keyof RegisterFormErrors> = {
  fullName: 'fullName',
  username: 'username',
  email: 'email',
  password: 'password',
};

const RegisterPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<RegisterFormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const updateField = useCallback((field: keyof typeof EMPTY_FORM, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const { [field]: _cleared, ...rest } = prev;
      return rest;
    });
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);

      const errors = validateRegisterForm(form);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
      setFieldErrors({});
      setSubmitting(true);

      const username = form.username.trim();

      try {
        await authService.register({
          fullName: form.fullName.trim(),
          username,
          email: form.email.trim(),

          password: form.password,
        });
      } catch (err) {
        console.error('Lỗi đăng ký:', err);

        const fieldErrors = getApiFieldErrors(err);
        if (fieldErrors) {
          const mapped: RegisterFormErrors = {};
          Object.entries(fieldErrors).forEach(([backendField, message]) => {
            const field = FIELD_BY_BACKEND_NAME[backendField];
            if (field) mapped[field] = message;
          });
          if (Object.keys(mapped).length > 0) setFieldErrors(mapped);
        }

        setError(getApiErrorMessage(err, 'Đăng ký thất bại. Vui lòng thử lại.'));
        setSubmitting(false);
        return;
      }

      showToast('Đăng ký thành công! Vui lòng đăng nhập.', 'success');
      navigate(ROUTE_PATHS.login, { replace: true, state: { registeredUsername: username } });
    },
    [form, navigate, showToast]
  );

  if (isAuthenticated) return <Navigate to={ROUTE_PATHS.home} replace />;

  return (
    <div className="auth-page">

      <main className="auth-page-main">
        <div className="auth-card">
          <h1 className="auth-card-title">Tạo tài khoản mới</h1>

          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            <div className="mb-3">
              <input
                type="text"
                className={`form-control form-control-lg${fieldErrors.fullName ? ' is-invalid' : ''}`}
                placeholder="Họ và tên"
                aria-label="Họ và tên"
                value={form.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                disabled={submitting}
                maxLength={FULL_NAME_MAX}
                autoComplete="name"
              />
              {fieldErrors.fullName && (
                <div className="invalid-feedback d-block">{fieldErrors.fullName}</div>
              )}
            </div>

            <div className="mb-3">
              <input
                type="text"
                className={`form-control form-control-lg${fieldErrors.username ? ' is-invalid' : ''}`}
                placeholder="Tên đăng nhập"
                aria-label="Tên đăng nhập"
                value={form.username}
                onChange={(e) => updateField('username', e.target.value)}
                disabled={submitting}
                maxLength={USERNAME_MAX}
                autoComplete="username"
              />
              {fieldErrors.username ? (
                <div className="invalid-feedback d-block">{fieldErrors.username}</div>
              ) : (
                <small className="auth-hint">
                  {USERNAME_MIN}-{USERNAME_MAX} ký tự
                </small>
              )}
            </div>

            <div className="mb-3">
              <input
                type="email"
                className={`form-control form-control-lg${fieldErrors.email ? ' is-invalid' : ''}`}
                placeholder="Email"
                aria-label="Email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                disabled={submitting}
                maxLength={EMAIL_MAX}
                autoComplete="email"
              />
              {fieldErrors.email && (
                <div className="invalid-feedback d-block">{fieldErrors.email}</div>
              )}
            </div>

            <div className="mb-3">
              <PasswordInput
                placeholder="Mật khẩu"
                value={form.password}
                onChange={(password) => updateField('password', password)}
                disabled={submitting}
                invalid={Boolean(fieldErrors.password)}
                maxLength={PASSWORD_MAX}
                autoComplete="new-password"
                visible={showPassword}
                onToggleVisible={() => setShowPassword((prev) => !prev)}
              />
              {fieldErrors.password ? (
                <div className="invalid-feedback d-block">{fieldErrors.password}</div>
              ) : (
                <small className="auth-hint">
                  Ít nhất {PASSWORD_MIN} ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt
                </small>
              )}
            </div>

            <div className="mb-3">
              <PasswordInput
                placeholder="Xác nhận mật khẩu"
                value={form.confirmPassword}
                onChange={(confirmPassword) => updateField('confirmPassword', confirmPassword)}
                disabled={submitting}
                invalid={Boolean(fieldErrors.confirmPassword)}
                maxLength={PASSWORD_MAX}
                autoComplete="new-password"
                visible={showPassword}
                onToggleVisible={() => setShowPassword((prev) => !prev)}
              />
              {fieldErrors.confirmPassword && (
                <div className="invalid-feedback d-block">{fieldErrors.confirmPassword}</div>
              )}
            </div>

            <button type="submit" className="btn btn-notion w-100 btn-lg" disabled={submitting}>
              {submitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Đang đăng ký...
                </>
              ) : (
                'Đăng ký'
              )}
            </button>
          </form>

          <p className="auth-switch">
            Đã có tài khoản? <Link to={ROUTE_PATHS.login}>Đăng nhập</Link>
          </p>
        </div>
      </main>

    </div>
  );
};

export default RegisterPage;
