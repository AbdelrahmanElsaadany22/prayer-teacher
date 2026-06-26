import type { Prayer } from '../types/prayer.types';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../shared/i18n/LanguageProvider';
import css from './PrayerSetup.module.css';

interface Props {
  prayers: Prayer[];
  selected: Prayer | null;
  onSelect: (p: Prayer) => void;
  onStart: () => void;
}

export function PrayerSetup({ prayers, selected, onSelect, onStart }: Props) {
  const { t, lang } = useI18n();

  return (
    <div className={css.setup}>
      <Link to="/dashboard" className={css.backBtn}>
        {lang === 'ar' ? '→' : '←'}
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
