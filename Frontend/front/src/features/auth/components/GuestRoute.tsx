import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { homeFor } from '../homeFor';

export default function GuestRoute() {
  const { user, isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return <div className="page-loader">Restoring your session...</div>;
  }

  return isAuthenticated ? <Navigate to={homeFor(user)} replace /> : <Outlet />;
}
