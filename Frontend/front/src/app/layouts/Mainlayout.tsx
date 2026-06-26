import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';
import NotificationBell from '../../features/notifications/components/NotificationBell';
import UserSearch from '../../features/users/components/UserSearch';
import { useI18n } from '../../shared/i18n/LanguageProvider';
import { avatarUrl } from '../../shared/utils/avatar';

export default function MainLayout() {
  const { isAuthenticated, user } = useAuth();
  const { t } = useI18n();

  const initial = user?.name?.[0]?.toUpperCase() ?? '?';
  const picSrc = avatarUrl(user?.profilePicture);

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/">
          <img src="/logo.png" alt="logo" className="brand-logo" />
          <span>{t('brand.name')}</span>
        </Link>

        <nav aria-label="Main navigation">
          {isAuthenticated ? (
            <>
              <UserSearch />
              <NavLink to="/dashboard">{t('nav.dashboard')}</NavLink>
              <NavLink to="/friends">{t('nav.friends')}</NavLink>
              <NotificationBell />
              <NavLink to="/profile" className="nav-user-pill" aria-label={t('nav.myProfile')}>
                <span className="nav-avatar">
                  {picSrc ? <img src={picSrc} alt={user?.name} /> : initial}
                </span>
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/login">{t('nav.login')}</NavLink>
              <NavLink className="nav-signup" to="/signup">{t('nav.signup')}</NavLink>
            </>
          )}
        </nav>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="site-footer">
        <span>{t('footer.brand')}</span>
        <span>{t('footer.privacy')}</span>
      </footer>
    </div>
  );
}
