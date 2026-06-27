import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';
import NotificationBell from '../../features/notifications/components/NotificationBell';
import UserSearch from '../../features/users/components/UserSearch';
import { useI18n } from '../../shared/i18n/LanguageProvider';
import { api } from '../../shared/api/axios';
import { avatarUrl } from '../../shared/utils/avatar';

export default function MainLayout() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const { t } = useI18n();
  const [navPic, setNavPic] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) { setNavPic(null); return; }
    api.get<{ profilePicture?: string | null }>('/user/current')
      .then(r => setNavPic(avatarUrl(r.data.profilePicture) ?? null))
      .catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    function onUpdate(e: Event) {
      setNavPic((e as CustomEvent<string | null>).detail);
    }
    window.addEventListener('nav-pic-update', onUpdate);
    return () => window.removeEventListener('nav-pic-update', onUpdate);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function handleLogout() {
    setMenuOpen(false);
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
              <div className="nav-start">
                <NavLink to="/dashboard">{t('nav.dashboard')}</NavLink>
                <NavLink to="/friends">{t('nav.friends')}</NavLink>
              </div>
              <div className="nav-center">
                <UserSearch />
              </div>
              <div className="nav-end">
                <NotificationBell />

                <div className="nav-profile" ref={menuRef}>
                  <button
                    type="button"
                    className="nav-avatar-btn"
                    onClick={() => setMenuOpen(o => !o)}
                    aria-label={t('nav.myProfile')}
                    aria-expanded={menuOpen}
                  >
                    <span className="nav-avatar">
                      {navPic ? <img src={navPic} alt={user?.name} /> : initial}
                    </span>
                  </button>

                  {menuOpen && (
                    <div className="nav-menu">
                      <div className="nav-menu-user">
                        <span className="nav-menu-name">{user?.name}</span>
                        <span className="nav-menu-email">{user?.email}</span>
                      </div>
                      <div className="nav-menu-divider" />
                      <Link
                        to="/profile"
                        className="nav-menu-item"
                        onClick={() => setMenuOpen(false)}
                      >
                        {t('nav.myProfile')}
                      </Link>
                      <button
                        type="button"
                        className="nav-menu-item nav-menu-logout"
                        onClick={handleLogout}
                      >
                        {t('nav.logout')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="nav-guest">
              <NavLink to="/login" className="nav-guest-login">{t('nav.login')}</NavLink>
              <NavLink to="/signup" className="nav-guest-signup">{t('nav.signup')}</NavLink>
            </div>
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
