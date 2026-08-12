import React from 'react';
import { useLocation } from 'react-router-dom';
import ForgotPasswordForm from '../../components/auth/ForgotPasswordForm';
import { ROUTE_PATHS } from '../../routes/paths';

const AdminForgotPasswordPage: React.FC = () => {
  const location = useLocation();
  const state = location.state as { from?: string } | null;

  return (
    <ForgotPasswordForm
      backTo={state?.from ?? ROUTE_PATHS.adminLogin}
      loginTo={ROUTE_PATHS.adminLogin}
    />
  );
};

export default AdminForgotPasswordPage;
