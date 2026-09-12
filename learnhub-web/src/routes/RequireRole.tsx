import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RouteLoading from '../components/layouts/RouteLoading';

interface RequireRoleProps {
  role: string;
  redirectTo: string;
}

const RequireRole = ({ role, redirectTo }: RequireRoleProps) => {
  const { isAuthenticated, isLoading, roles } = useAuth();

  if (isLoading) {
    return <RouteLoading />;
  }

  if (!isAuthenticated || !roles.includes(role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
};

export default RequireRole;
