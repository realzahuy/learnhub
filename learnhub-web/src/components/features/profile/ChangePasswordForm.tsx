import React, { useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { userService } from '../../../services/api/user.service';
import { useToast } from '../../../context/ToastContext';
import { getApiErrorMessage } from '../../../utils';
import { ROUTE_PATHS } from '../../../routes/paths';
import './ChangePasswordForm.css';

const SPECIAL_CHARS = "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?";

const checkStrength = (pw: string): string | null => {
  if (pw.length < 8) return 'Mật khẩu mới phải có ít nhất 8 ký tự';
  if (pw.length > 128) return 'Mật khẩu mới không được quá 128 ký tự';
  if (!/[A-Z]/.test(pw)) return 'Mật khẩu mới phải có ít nhất 1 chữ hoa';
  if (!/[a-z]/.test(pw)) return 'Mật khẩu mới phải có ít nhất 1 chữ thường';
  if (!/[0-9]/.test(pw)) return 'Mật khẩu mới phải có ít nhất 1 chữ số';
  if (![...pw].some((c) => SPECIAL_CHARS.includes(c)))
    return 'Mật khẩu mới phải có ít nhất 1 ký tự đặc biệt';
  return null;
};

type PasswordField = 'old' | 'new' | 'confirm';

interface FieldErrors {
  old?: string;
  new?: string;
  confirm?: string;
}

interface ChangePasswordFormProps {

  backTo: string;

  forgotPasswordTo?: string;
}

const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({
  backTo,
  forgotPasswordTo = ROUTE_PATHS.forgotPassword,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [visible, setVisible] = useState<Record<PasswordField, boolean>>({
    old: false,
    new: false,
    confirm: false,
  });
  const toggle = (field: PasswordField) =>
    setVisible((prev) => {
      if (field === 'old') return { ...prev, old: !prev.old };
      const next = !prev.new;
      return { ...prev, new: next, confirm: next };
    });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const goBackToProfile = useCallback(() => {
    navigate(backTo, { replace: true });
  }, [backTo, navigate]);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};

    if (!oldPassword) {
      next.old = 'Vui lòng nhập mật khẩu hiện tại';
    }

    const strengthError = checkStrength(newPassword);
    if (!newPassword) {
      next.new = 'Vui lòng nhập mật khẩu mới';
    } else if (strengthError) {
      next.new = strengthError;
    } else if (newPassword === oldPassword) {
      next.new = 'Mật khẩu mới phải khác mật khẩu hiện tại';
    }

    if (!confirmPassword) {
      next.confirm = 'Vui lòng nhập lại mật khẩu mới';
    } else if (confirmPassword !== newPassword) {
      next.confirm = 'Mật khẩu xác nhận không khớp';
    }

    return next;
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const validationErrors = validate();
      setErrors(validationErrors);
      if (Object.keys(validationErrors).length > 0) return;

      setSubmitting(true);
      try {
        await userService.changePassword(oldPassword, newPassword);
        showToast('Đổi mật khẩu thành công', 'success');
        goBackToProfile();
      } catch (err) {
        console.error('Đổi mật khẩu thất bại:', err);
        const message = getApiErrorMessage(err, 'Không thể đổi mật khẩu. Vui lòng thử lại.');

        if (message.toLowerCase().includes('cũ')) {
          setErrors({ old: message });
        } else {
          showToast(message, 'error');
        }
      } finally {
        setSubmitting(false);
      }
    },

    [oldPassword, newPassword, confirmPassword, goBackToProfile, showToast]
  );

  const passwordField = (
    field: PasswordField,
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    autoComplete: string,
    autoFocus = false
  ) => (
    <div className="password-input-wrap">
      <input
        type={visible[field] ? 'text' : 'password'}
        className={`form-control ${errors[field] ? 'is-invalid' : ''}`}
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={submitting}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => toggle(field)}
        aria-label={visible[field] ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        tabIndex={-1}
      >
        <i className={`bi ${visible[field] ? 'bi-eye-slash' : 'bi-eye'}`}></i>
      </button>
    </div>
  );

  return (
    <div className="change-password-card">
      <h2 className="change-password-title">Đổi mật khẩu</h2>

      <form onSubmit={handleSubmit} noValidate>
        <div className="change-password-field">
          {passwordField(
            'old',
            oldPassword,
            setOldPassword,
            'Mật khẩu hiện tại',
            'current-password',
            true
          )}
          {errors.old && <div className="change-password-error">{errors.old}</div>}
          {

}
          <div className="change-password-forgot">
            <Link to={forgotPasswordTo} state={{ from: location.pathname }}>
              Quên mật khẩu hiện tại?
            </Link>
          </div>
        </div>

        <div className="change-password-field">
          {passwordField('new', newPassword, setNewPassword, 'Mật khẩu mới', 'new-password')}
          {errors.new ? (
            <div className="change-password-error">{errors.new}</div>
          ) : (
            <div className="change-password-hint">
              Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.
            </div>
          )}
        </div>

        <div className="change-password-field">
          {passwordField(
            'confirm',
            confirmPassword,
            setConfirmPassword,
            'Xác nhận mật khẩu mới',
            'new-password'
          )}
          {errors.confirm && <div className="change-password-error">{errors.confirm}</div>}
        </div>

        <div className="change-password-actions">
          <button
            type="button"
            className="btn-change-password-cancel"
            onClick={goBackToProfile}
            disabled={submitting}
          >
            Hủy
          </button>
          <button type="submit" className="btn-change-password-submit" disabled={submitting}>
            {submitting ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                Đang đổi...
              </>
            ) : (
              'Đổi mật khẩu'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChangePasswordForm;
