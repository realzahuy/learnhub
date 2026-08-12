import React from 'react';
import { Outlet } from 'react-router-dom';
import './ProfilePage.css';

const ProfileLayout: React.FC = () => (
  <div className="profile-page">
    <Outlet />
  </div>
);

export default ProfileLayout;
