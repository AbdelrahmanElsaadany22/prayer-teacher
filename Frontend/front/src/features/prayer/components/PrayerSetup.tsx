import { Link } from 'react-router-dom';
import type { Prayer } from '../types/prayer.types';
import { useI18n } from '../../../shared/i18n/LanguageProvider';
import css from './PrayerSetup.module.css';

interface Props {
  prayers: Prayer[];
  selected: Prayer | null;
  onSelect: (p: Prayer) => void;
  onStart: () => void;
}

export function PrayerSetup({ prayers, selected, onSelect, onStart }: Props) {
  const { t } = useI18n();

  return (
    <div className={css.setup}>
      <Link to="/dashboard" className={css.back}>
        <svg className={css.backChevron} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
      <div className={css.logo}>{t('setup.logo')}</div>
      <div className={css.sub}>{t('setup.sub')}</div>

      <button
        type="button"
        className={css.startBtn}
        disabled={!selected}
        onClick={onStart}
      >
        {t('setup.begin')}
      </button>

      <div className={css.grid}>
        {prayers.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`${css.card}${selected?.id === p.id ? ` ${css.selected}` : ''}`}
            onClick={() => onSelect(p)}
          >
            <div className={css.cardAr}>{p.ar}</div>
            <div className={css.cardEn}>{p.en}</div>
            <div className={css.cardRk}>{t('setup.rakas', { n: p.rakas })}</div>
          </button>
        ))}
      </div>

      <p className={css.tips}>{t('setup.tips')}</p>
    </div>
  );
}
