import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * For pages that only make sense for a learner. An admin has no friends list,
 * so reaching /friends — by typing it, or by a stale link — sends them to their
 * inbox rather than showing a page with nothing on it for them.
 */
export default function NonAdminRoute() {
  const { user, isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return <div className="page-loader">Restoring your session...</div>;
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin/messages" replace />;

  return <Outlet />;
}
