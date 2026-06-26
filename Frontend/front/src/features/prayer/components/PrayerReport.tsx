import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { ReportData, GroupedMistake } from '../types/prayer.types';
import { getPoseLabel } from '../constants/poses';
import { useI18n } from '../../../shared/i18n/LanguageProvider';
import { localizePrayerName } from '../../../shared/i18n/translations';
import css from './PrayerReport.module.css';

interface Props {
  data: ReportData;
  onRestart: () => void;
}

export function PrayerReport({ data, onRestart }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { t, lang } = useI18n();

  useEffect(() => {
    if (data.videoBlob && data.videoBlob.size > 5000 && videoRef.current) {
      videoRef.current.src = URL.createObjectURL(data.videoBlob);
      return () => {
        if (videoRef.current?.src) URL.revokeObjectURL(videoRef.current.src);
      };
    }
  }, [data.videoBlob]);

  const mistakes = Object.values(data.mistakeDetails) as GroupedMistake[];

  return (
    <div className={css.report}>
      <div className={css.header}>
        <h1>{t('report.title')}</h1>
        <p>
          {localizePrayerName(data.prayerName, lang)} — {data.duration}
        </p>
      </div>

      <div className={css.statsGrid}>
        <div className={css.statCard}>
          <div className={`${css.statNum} ${css.gold}`}>{data.rakas}</div>
          <div className={css.statLabel}>{t('report.rakasCompleted')}</div>
        </div>
        <div className={css.statCard}>
          <div className={`${css.statNum} ${css.red}`}>{data.mistakes}</div>
          <div className={css.statLabel}>{t('report.mistakesDetected')}</div>
        </div>
        <div className={css.statCard}>
          <div className={`${css.statNum} ${css.green}`}>{data.accuracy}%</div>
          <div className={css.statLabel}>{t('report.accuracyScore')}</div>
        </div>
      </div>

      {data.videoBlob && data.videoBlob.size > 5000 && (
        <div className={css.videoContainer}>
          <video ref={videoRef} className={css.reportVideo} controls />
          <div className={css.videoLabel}>{t('report.videoLabel')}</div>
        </div>
      )}

      <div className={css.section}>
        <h2>{t('report.mistakeLog')}</h2>
        {mistakes.length === 0 ? (
          <div className={css.noMistakes}>{t('report.noMistakes')}</div>
        ) : (
          mistakes.map((m) => (
            <div key={`${m.rakaIndex}-${m.stepLabel}`} className={css.mistakeItem}>
              <div className={css.mistakeInfo}>
                <strong>{t('report.rakaShort', { n: m.rakaIndex })} – {m.stepLabel}</strong>
                <div className={css.mistakeTime}>
                  {t('report.detectedAt', { pose: getPoseLabel(m.detectedPose, lang), time: m.time })}
                </div>
              </div>
              <span className={css.mistakeCount}>×{m.count}</span>
            </div>
          ))
        )}
      </div>

      <div className={css.actions}>
        <button type="button" className={css.restartBtn} onClick={onRestart}>
          {t('report.prayAgain')}
        </button>
        <Link to="/dashboard" className={css.dashBtn}>
          {t('report.dashboard')}
        </Link>
      </div>
    </div>
  );
}
