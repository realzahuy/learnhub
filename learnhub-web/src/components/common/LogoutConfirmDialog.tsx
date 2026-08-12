import React from 'react';
import ConfirmDialog from './ConfirmDialog';

interface LogoutConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const LogoutConfirmDialog: React.FC<LogoutConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => (
  <ConfirmDialog
    isOpen={isOpen}
    title="Bạn muốn đăng xuất?"
    confirmLabel="Đăng xuất"
    cancelLabel="Không"
    variant="danger"
    onConfirm={onConfirm}
    onCancel={onCancel}
  />
);

export default LogoutConfirmDialog;
