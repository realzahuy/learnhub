import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PasswordInput from './PasswordInput';
import { passwordResetService } from '../../services/api/passwordReset.service';
import { authService } from '../../services/api/auth.service';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatCountdown, useOtpCountdown } from '../../hooks/useOtpCountdown';
import { getApiErrorMessage, validatePasswordStrength } from '../../utils';
import './ForgotPasswordForm.css';

interface ForgotPasswordFormProps {

  backTo: string;

  loginTo: string;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ backTo, loginTo }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();

  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  const [step, setStep] = useState<'email' | 'reset'>('email');

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [passwordVisible, setPasswordVisible] = useState(false);

  const [sentMessage, setSentMessage] = useState('');
  const { expiresIn, resendAfter, startCountdown } = useOtpCountdown(step === 'reset');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setAccountEmail(null);
      return;
    }

    let cancelled = false;
    authService.getCurrentUser().then((currentUser) => {
      if (cancelled) return;
      setAccountEmail(currentUser.email);
      setEmail(currentUser.email);
    }).catch(() => {
      if (!cancelled) setAccountEmail(null);
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const requestCode = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Vui lòng nhập email');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Email không đúng định dạng');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const status = await passwordResetService.forgotPassword(trimmed);
      setSentMessage(status.message);
      startCountdown(status.expiresInSeconds, status.resendAfterSeconds);
      setStep('reset');
      setCode('');

      window.setTimeout(() => codeInputRef.current?.focus(), 0);
    } catch (err) {
      console.error('Gửi yêu cầu quên mật khẩu thất bại:', err);
      setError(getApiErrorMessage(err, 'Không gửi được mã. Vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  }, [email, startCountdown]);

  const handleReset = useCallback(async () => {
    if (!code.trim()) {
      setError('Vui lòng nhập mã xác thực');
      return;
    }

    const strengthError = validatePasswordStrength(newPassword);
    if (!newPassword) {
      setError('Vui lòng nhập mật khẩu mới');
      return;
    }
    if (strengthError) {
      setError(strengthError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await passwordResetService.resetPassword(email.trim(), code.trim(), newPassword);

      if (isAuthenticated) {
        await logout();
      }

      showToast('Đặt lại mật khẩu thành công. Hãy đăng nhập lại.', 'success');
      navigate(loginTo, { replace: true });
    } catch (err) {
      console.error('Đặt lại mật khẩu thất bại:', err);
      setError(getApiErrorMessage(err, 'Không đặt lại được mật khẩu. Vui lòng thử lại.'));
      setSubmitting(false);
    }
  }, [
    email,
    code,
    newPassword,
    confirmPassword,
    isAuthenticated,
    logout,
    loginTo,
    navigate,
    showToast,
  ]);

  return (
    <div className="forgot-password-card">
      <h1 className="forgot-password-title">Quên mật khẩu</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step === 'email') requestCode();
          else handleReset();
        }}
        noValidate
      >
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {step === 'email' ? (
          <>
            {

}
            {authLoading ? (
              <div className="forgot-password-loading" role="status">
                <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                <span>Đang tải...</span>
              </div>
            ) : accountEmail ? (
              <>
                <p className="forgot-password-lead">
                  Chúng tôi sẽ gửi mã xác thực tới email của tài khoản bạn đang đăng nhập.
                </p>

                {
}
                <div className="mb-3 forgot-password-account">
                  <span className="forgot-password-account-label">Email</span>
                  <span className="forgot-password-account-value">{accountEmail}</span>
                </div>
              </>
            ) : (
              <>
                <p className="forgot-password-lead">
                  Nhập email bạn đã dùng để đăng ký. Chúng tôi sẽ gửi mã xác thực tới hòm thư đó.
                </p>

                <div className="mb-3">
                  <input
                    type="email"
                    className="form-control form-control-lg"
                    placeholder="Email"
                    aria-label="Email"
                    value={email}
                    onChange={(e) => {
                      setError(null);
                      setEmail(e.target.value);
                    }}
                    disabled={submitting}
                    autoComplete="email"
                    maxLength={100}

                    autoFocus
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              className="btn btn-notion w-100 btn-lg"
              disabled={submitting || authLoading}
            >
              {submitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Đang gửi mã...
                </>
              ) : (
                'Gửi mã xác thực'
              )}
            </button>
          </>
        ) : (
          <>
            {
}
            <p className="forgot-password-lead">{sentMessage}</p>

            <div className="mb-3">
              <input
                ref={codeInputRef}
                type="text"
                className="form-control form-control-lg forgot-password-code"
                placeholder="000000"
                aria-label="Mã xác thực"
                value={code}

                inputMode="numeric"

                onChange={(e) => {
                  setError(null);
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                }}
                maxLength={6}
                disabled={submitting}
                autoComplete="one-time-code"
              />
              <span className="forgot-password-hint">
                {expiresIn > 0 ? (
                  <>Mã còn hiệu lực {formatCountdown(expiresIn)}.</>
                ) : (

                  <>Mã đã hết hạn, hãy bấm "Gửi lại mã".</>
                )}
              </span>
            </div>

            <div className="mb-3">
              <PasswordInput
                placeholder="Mật khẩu mới"
                value={newPassword}
                onChange={(value) => {
                  setError(null);
                  setNewPassword(value);
                }}
                disabled={submitting}
                autoComplete="new-password"
                visible={passwordVisible}
                onToggleVisible={() => setPasswordVisible((prev) => !prev)}
              />
              <span className="forgot-password-hint">
                Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.
              </span>
            </div>

            <div className="mb-3">
              <PasswordInput
                placeholder="Xác nhận mật khẩu mới"
                value={confirmPassword}
                onChange={(value) => {
                  setError(null);
                  setConfirmPassword(value);
                }}
                disabled={submitting}
                autoComplete="new-password"
                visible={passwordVisible}
                onToggleVisible={() => setPasswordVisible((prev) => !prev)}
              />
            </div>

            <button type="submit" className="btn btn-notion w-100 btn-lg" disabled={submitting}>
              {submitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Đang đặt lại...
                </>
              ) : (
                'Đặt lại mật khẩu'
              )}
            </button>

            <div className="forgot-password-resend">
              <span>Chưa nhận được thư?</span>
              <button
                type="button"
                className="forgot-password-resend-btn"
                onClick={requestCode}
                disabled={submitting || resendAfter > 0}
              >
                {resendAfter > 0 ? `Gửi lại mã (${resendAfter}s)` : 'Gửi lại mã'}
              </button>
            </div>
          </>
        )}
      </form>

      {
}
      <div className="forgot-password-back">
        <Link to={backTo}>Quay lại</Link>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
