import React from 'react';
import { Navigate } from 'react-router-dom';
import { ChangePasswordForm } from '../../components/features/profile';
import { useAuth } from '../../context/AuthContext';
import { ROUTE_PATHS } from '../../routes/paths';
import { LoadingScreen } from '../../components/common';
import './ChangePasswordPage.css';

const ChangePasswordPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen variant="form" count={3} />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTE_PATHS.home} replace />;
  }

  return (
    <main className="change-password-main">
      <div className="container py-5">
        <ChangePasswordForm backTo={ROUTE_PATHS.profile} />
      </div>
    </main>
  );
};

export default ChangePasswordPage;
