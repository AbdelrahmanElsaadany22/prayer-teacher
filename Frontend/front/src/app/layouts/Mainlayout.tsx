import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';
import NotificationBell from '../../features/notifications/components/NotificationBell';
import UserSearch from '../../features/users/components/UserSearch';
import { useI18n } from '../../shared/i18n/LanguageProvider';
import { LANGUAGES } from '../../shared/i18n/translations';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export default function MainLayout() {
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useAuth();
  const { t, lang, setLang } = useI18n();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const initial = user?.name?.[0]?.toUpperCase() ?? '?';

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
              <NavLink to="/profile" className="nav-user-pill">
                <span className="nav-avatar">
                  {initial}
                </span>
                <span>{user?.name}</span>
              </NavLink>
              <button className="nav-button" type="button" onClick={handleLogout}>
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">{t('nav.login')}</NavLink>
              <NavLink className="nav-signup" to="/signup">
                {t('nav.signup')}
              </NavLink>
            </>
          )}

          <div className="lang-pill" role="group" aria-label="Select language">
            {LANGUAGES.map(({ code, label }) => (
              <button
                key={code}
                className={`lang-opt${lang === code ? ' lang-opt--active' : ''}`}
                type="button"
                onClick={() => setLang(code)}
                aria-pressed={lang === code}
              >
                {label}
              </button>
            ))}
          </div>
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
