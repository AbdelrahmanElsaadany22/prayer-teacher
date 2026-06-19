import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { useI18n } from '../../shared/i18n/LanguageProvider';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { t } = useI18n();

  return (
    <section className="home-page">
      <span className="eyebrow">{t('home.eyebrow')}</span>
      <h1>{t('home.title')}</h1>
      <p>{t('home.subtitle')}</p>
      <Link
        className="primary-link"
        to={isAuthenticated ? '/dashboard' : '/signup'}
      >
        {isAuthenticated ? t('home.ctaDashboard') : t('home.ctaStart')}
      </Link>
    </section>
  );
}
