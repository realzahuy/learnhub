import React from 'react';
import ConfirmDialog from './ConfirmDialog';

interface LogoutConfirmDialogProps {
  isOpen: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const LogoutConfirmDialog: React.FC<LogoutConfirmDialogProps> = ({
  isOpen,
  pending = false,
  onConfirm,
  onCancel,
}) => (
  <ConfirmDialog
    isOpen={isOpen}
    title="Bạn muốn đăng xuất?"
    confirmLabel={pending ? 'Đang đăng xuất...' : 'Đăng xuất'}
    cancelLabel="Không"
    variant="danger"
    pending={pending}
    onConfirm={onConfirm}
    onCancel={onCancel}
  />
);

export default LogoutConfirmDialog;
