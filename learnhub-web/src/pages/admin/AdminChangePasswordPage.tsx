import React from 'react';
import { ChangePasswordForm } from '../../components/features/profile';
import { ROUTE_PATHS } from '../../routes/paths';

const AdminChangePasswordPage: React.FC = () => {
  return (
      <ChangePasswordForm
        backTo={ROUTE_PATHS.adminProfile}
        forgotPasswordTo={ROUTE_PATHS.adminForgotPassword}
      />
  );
};

export default AdminChangePasswordPage;
