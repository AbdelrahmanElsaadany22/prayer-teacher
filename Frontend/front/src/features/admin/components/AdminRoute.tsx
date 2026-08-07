import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';

/**
 * Gate for the admin pages. This only hides the UI — every /admin endpoint
 * checks the role server-side too, since a route guard in the browser is a
 * convenience, never a security boundary.
 */
export default function AdminRoute() {
  const { user, isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return <div className="page-loader">Restoring your session...</div>;
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
