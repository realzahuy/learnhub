import { useState } from 'react';
import './PasswordInput.css';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  invalid?: boolean;
  autoComplete: string;
  maxLength?: number;
  autoFocus?: boolean;

  visible?: boolean;
  onToggleVisible?: () => void;
}

const PasswordInput = ({
  value,
  onChange,
  placeholder,
  disabled = false,
  invalid,
  autoComplete,
  maxLength,
  autoFocus,
  visible: controlledVisible,
  onToggleVisible,
}: PasswordInputProps) => {
  const [selfVisible, setSelfVisible] = useState(false);

  const visible = controlledVisible ?? selfVisible;
  const toggle = onToggleVisible ?? (() => setSelfVisible((prev) => !prev));

  return (
    <div className="auth-password-field">
      <input
        type={visible ? 'text' : 'password'}
        className={`form-control form-control-lg${invalid ? ' is-invalid' : ''}`}
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        maxLength={maxLength}
        autoComplete={autoComplete}

        autoFocus={autoFocus}
      />
      <button
        type="button"
        className="auth-password-toggle"
        onClick={toggle}
        disabled={disabled}
        aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        title={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}

        tabIndex={-1}
      >
        <i className={visible ? 'bi bi-eye-slash' : 'bi bi-eye'}></i>
      </button>
    </div>
  );
};

export default PasswordInput;
