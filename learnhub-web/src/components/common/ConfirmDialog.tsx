import React, { useEffect, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './ConfirmDialog.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  pending?: boolean;
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
  pending = false,
  onConfirm,
  onCancel,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);
  const pendingRef = useRef(pending);
  onCancelRef.current = onCancel;
  pendingRef.current = pending;

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!pendingRef.current) onCancelRef.current();
        return;
      }

      if (event.key === 'Tab') {
        const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
        if (!buttons || buttons.length === 0) {
          event.preventDefault();
          return;
        }

        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    confirmButtonRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={dialogRef}
      className="modal show d-block confirm-dialog"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-busy={pending}
      aria-labelledby="confirm-dialog-title"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => {

        if (e.target === e.currentTarget && !pending) onCancel();
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
              disabled={pending}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              ref={confirmButtonRef}
              className={`confirm-dialog-btn confirm-dialog-btn-${variant}`}
              onClick={onConfirm}
              disabled={pending}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmDialog;
