import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { useI18n } from '../../shared/i18n/LanguageProvider';

export default function MainLayout() {
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useAuth();
  const { t, lang, toggleLang } = useI18n();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/">
          <span className="brand-mark">ص</span>
          <span>{t('brand.name')}</span>
        </Link>

        <nav aria-label="Main navigation">
          {isAuthenticated ? (
            <>
              <NavLink to="/dashboard">{t('nav.dashboard')}</NavLink>
              <span className="nav-user">{user?.name}</span>
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

          <button
            className="lang-toggle"
            type="button"
            onClick={toggleLang}
            aria-label="Switch language"
            title={lang === 'ar' ? 'English' : 'العربية'}
          >
            {lang === 'ar' ? 'EN' : 'ع'}
          </button>
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
