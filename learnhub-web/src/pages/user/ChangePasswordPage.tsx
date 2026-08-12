import React from 'react';
import { Navigate } from 'react-router-dom';
import { ChangePasswordForm } from '../../components/features/profile';
import { useAuth } from '../../context/AuthContext';
import { ROUTE_PATHS } from '../../routes/paths';
import './ChangePasswordPage.css';

const ChangePasswordPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="change-password-main">
        <div className="container py-5 text-center">
          <div className="spinner-border text-notion" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      </main>
    );
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
