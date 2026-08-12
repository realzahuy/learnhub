import { Navigate, Outlet } from 'react-router-dom';
import { LoadingScreen } from '../components/common';
import { useAuth } from '../context/AuthContext';

interface RequireRoleProps {
  role: string;
  redirectTo: string;
}

const RequireRole = ({ role, redirectTo }: RequireRoleProps) => {
  const { isAuthenticated, isLoading, roles } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated || !roles.includes(role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
};

export default RequireRole;
