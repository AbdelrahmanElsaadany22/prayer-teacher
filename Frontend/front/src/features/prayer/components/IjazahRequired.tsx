import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../../../shared/i18n/LanguageProvider';
import { getChatAdmin } from '../../chat/api/chat.api';
import css from './IjazahRequired.module.css';

/**
 * Shown instead of the prayer session when the learner hasn't been certified
 * for Al-Fatiha yet. It replaces the session rather than redirecting, so
 * someone who followed a link or a bookmark lands on an explanation of what to
 * do next instead of being bounced somewhere with no reason given.
 */
export default function IjazahRequired() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openTeacherChat() {
    setOpening(true);
    setError(null);
    try {
      const admin = await getChatAdmin();
      navigate(`/chat/${admin._id}`);
    } catch {
      setError(t('ijazah.noAdmin'));
      setOpening(false);
    }
  }

  const steps = [
    t('locked.step1'),
    t('locked.step2'),
    t('locked.step3'),
    t('locked.step4'),
  ];

  return (
    <div className={css.page} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className={css.card}>
        <div className={css.icon} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <rect x="4" y="10" width="16" height="11" rx="2.5"
              stroke="currentColor" strokeWidth="1.8" />
            <path d="M8 10V7a4 4 0 1 1 8 0v3" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>

        <span className={css.eyebrow}>{t('locked.eyebrow')}</span>
        <h1 className={css.title}>{t('locked.title')}</h1>
        <p className={css.lead}>{t('locked.lead')}</p>

        <ol className={css.steps}>
          {steps.map((step, i) => (
            <li key={i} className={css.step}>
              <span className={css.stepNum}>{i + 1}</span>
              <span className={css.stepText}>{step}</span>
            </li>
          ))}
        </ol>

        {error && <p className={css.error}>{error}</p>}

        <div className={css.actions}>
          <button
            type="button"
            className={css.primaryBtn}
            onClick={() => void openTeacherChat()}
            disabled={opening}
          >
            {opening ? t('ijazah.opening') : t('locked.cta')}
          </button>
          <Link to="/dashboard" className={css.ghostLink}>
            {t('locked.backToDashboard')}
          </Link>
        </div>

        <p className={css.note}>{t('locked.note')}</p>
      </div>
    </div>
  );
}
