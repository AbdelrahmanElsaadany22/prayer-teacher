import { Link } from 'react-router-dom';
import { useI18n } from '../../shared/i18n/LanguageProvider';

export default function NotFound() {
  const { t } = useI18n();

  return (
    <section className="not-found-page">
      <div className="not-found-code" aria-label="404">
        ٤٠٤
      </div>

      <div className="not-found-rule" aria-hidden="true">
        <span />
        <span className="not-found-diamond">◆</span>
        <span />
      </div>

      <span className="eyebrow">{t('notFound.eyebrow')}</span>
      <h1>{t('notFound.title')}</h1>
      <p>{t('notFound.subtitle')}</p>

      <Link className="primary-link not-found-cta" to="/">
        {t('notFound.cta')}
      </Link>
    </section>
  );
}
