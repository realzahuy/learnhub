import React, { useEffect, useRef, ReactNode } from 'react';
import './ConfirmDialog.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    confirmButtonRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="modal show d-block confirm-dialog"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => {

        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal-dialog modal-dialog-centered confirm-dialog-panel">
        <div className="modal-content confirm-dialog-content">
          <h2 className="confirm-dialog-title" id="confirm-dialog-title">
            {title}
          </h2>

          {message && <p className="confirm-dialog-message">{message}</p>}

          <div className="confirm-dialog-actions">
            <button
              type="button"
              className="confirm-dialog-btn confirm-dialog-btn-cancel"
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              ref={confirmButtonRef}
              className={`confirm-dialog-btn confirm-dialog-btn-${variant}`}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
