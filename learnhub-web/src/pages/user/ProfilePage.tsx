import React from 'react';
import { Navigate } from 'react-router-dom';
import { ProfileEditor } from '../../components/features/profile';
import { BackButton } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { ROUTE_PATHS } from '../../routes/paths';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <main className="profile-main">
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
    <main className="profile-main">
      <BackButton fallback={ROUTE_PATHS.home} />
      <div className="container py-5">
        <ProfileEditor showInstructorUpgrade />
      </div>
    </main>
  );
};

export default ProfilePage;
