import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../../../context/ToastContext';
import { formatCountdown, useOtpCountdown } from '../../../hooks/useOtpCountdown';
import { emailVerificationService } from '../../../services/api/emailVerification.service';
import { getApiErrorMessage } from '../../../utils';

interface EmailVerificationPanelProps {

  onVerified: () => void;
}

const EmailVerificationPanel: React.FC<EmailVerificationPanelProps> = ({ onVerified }) => {
  const { showToast } = useToast();

  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState('');

  const { expiresIn, resendAfter, startCountdown } = useOtpCountdown(open);

  const codeInputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setCode('');
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, close]);

  const handleSend = useCallback(async () => {
    setSending(true);
    setError(null);
    try {
      const status = await emailVerificationService.send();
      setMaskedEmail(status.email);
      startCountdown(status.expiresInSeconds, status.resendAfterSeconds);
      setOpen(true);
      setCode('');
      showToast('Đã gửi mã xác thực tới email của bạn.', 'success');

      window.setTimeout(() => codeInputRef.current?.focus(), 0);
    } catch (err) {
      console.error('Không thể gửi mã xác thực:', err);
      const message = getApiErrorMessage(err, 'Không gửi được mã xác thực. Vui lòng thử lại.');

      setOpen(true);
      setError(message);
    } finally {
      setSending(false);
    }
  }, [showToast, startCountdown]);

  const handleConfirm = useCallback(async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Vui lòng nhập mã xác thực');
      return;
    }

    setConfirming(true);
    setError(null);
    try {
      await emailVerificationService.confirm(trimmed);
      showToast('Xác thực email thành công!', 'success');
      close();
      onVerified();
    } catch (err) {
      console.error('Không thể xác thực email:', err);
      setError(getApiErrorMessage(err, 'Mã xác thực không đúng. Vui lòng thử lại.'));
    } finally {
      setConfirming(false);
    }
  }, [code, close, onVerified, showToast]);

  return (
    <>
      {
}
      <button
        type="button"
        className="profile-verify-btn"
        onClick={handleSend}
        disabled={sending}
      >
        <i className="bi bi-exclamation-circle-fill"></i>
        {sending ? 'Đang gửi mã...' : 'Xác thực email'}
      </button>

      {open &&
        createPortal(
          <div
            className="modal show d-block verify-modal"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="verify-modal-title"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={(e) => {

              if (e.target === e.currentTarget) close();
            }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content verify-modal-content">
                <h2 className="verify-modal-title" id="verify-modal-title">
                  Xác thực email
                </h2>

                <p className="verify-modal-hint">
                  Nhập mã 6 chữ số vừa gửi tới <strong>{maskedEmail || 'email của bạn'}</strong>.
                  {expiresIn > 0 ? (
                    <> Mã còn hiệu lực {formatCountdown(expiresIn)}.</>
                  ) : (

                    <> Mã đã hết hạn, hãy bấm "Gửi lại mã".</>
                  )}
                </p>

                {error && <div className="verify-modal-error">{error}</div>}

                {

}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleConfirm();
                  }}
                  noValidate
                >
                  <input
                    ref={codeInputRef}
                    type="text"
                    className="form-control verify-modal-input"
                    placeholder="000000"
                    aria-label="Mã xác thực"
                    value={code}

                    inputMode="numeric"

                    onChange={(e) => {
                      setError(null);
                      setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                    }}
                    maxLength={6}
                    disabled={confirming}
                  />

                  <div className="verify-modal-actions">
                    <button
                      type="button"
                      className="btn-profile-outline"
                      onClick={handleSend}
                      disabled={sending || resendAfter > 0}
                      title={resendAfter > 0 ? `Đợi ${resendAfter} giây nữa` : undefined}
                    >
                      {resendAfter > 0 ? `Gửi lại (${resendAfter}s)` : 'Gửi lại mã'}
                    </button>

                    <button
                      type="submit"
                      className="btn-profile-primary"
                      disabled={confirming}
                    >
                      {confirming ? 'Đang kiểm tra...' : 'Xác nhận'}
                    </button>
                  </div>
                </form>

                <button type="button" className="verify-modal-close" onClick={close}>
                  Đóng
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default EmailVerificationPanel;
