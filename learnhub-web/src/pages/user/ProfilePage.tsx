import React from 'react';
import RouteLoading from '../../components/layouts/RouteLoading';
import { Navigate } from 'react-router-dom';
import { ProfileEditor } from '../../components/features/profile';
import { BackButton } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { ROUTE_PATHS } from '../../routes/paths';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return <RouteLoading />;
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
