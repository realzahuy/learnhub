import React from 'react';
import { ProfileEditor } from '../../components/features/profile';
import { ROUTE_PATHS } from '../../routes/paths';
import './AdminProfilePage.css';

const AdminProfilePage: React.FC = () => {
  return (
      <div className="admin-profile-wrap">
        <ProfileEditor changePasswordPath={ROUTE_PATHS.adminProfileChangePassword} />
      </div>
  );
};

export default AdminProfilePage;
