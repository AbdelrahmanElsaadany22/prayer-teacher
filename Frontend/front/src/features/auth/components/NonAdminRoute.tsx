import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * For pages that only make sense for a learner — their own prayer dashboard and
 * their friends list. An admin reaching one, by typing the URL or following a
 * stale link, is sent to the admin home instead of a page with nothing on it
 * for them.
 */
export default function NonAdminRoute() {
  const { user, isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return <div className="page-loader">Restoring your session...</div>;
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin/users" replace />;

  return <Outlet />;
}
