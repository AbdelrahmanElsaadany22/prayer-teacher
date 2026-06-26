import type { RefObject } from 'react';
import type { PoseStep, PoseBadgeState } from '../types/prayer.types';
import { useI18n } from '../../../shared/i18n/LanguageProvider';
import { VideoCanvas } from './VideoCanvas';
import css from './SessionUI.module.css';

function formatSeqLabel(label: string): string {
  return label
    .replace('Sujood 1', 'Sj1')
    .replace('Sujood 2', 'Sj2')
    .replace('Tashahhud', 'Tsh')
    .replace("I'tidal", "I'td");
}

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  prayerName: string;
  rakaNum: number;
  rakaTotal: number;
  poseBadgeText: string;
  poseBadgeState: PoseBadgeState;
  sequence: PoseStep[];
  stepIndex: number;
  detectedLabel: string;
  expectedLabel: string;
  recentMistakes: string[];
  alert: { ar: string; en: string } | null;
  countdown: number | null;
  onEnd: () => void;
}

export function SessionUI({
  videoRef, canvasRef,
  prayerName, rakaNum, rakaTotal,
  poseBadgeText, poseBadgeState,
  sequence, stepIndex,
  detectedLabel, expectedLabel,
  recentMistakes, alert,
  countdown,
  onEnd,
}: Props) {
  const { t } = useI18n();

  return (
    <div className={css.session}>
      {/* Topbar */}
      <div className={css.topbar}>
        <div className={css.topbarLeft}>
          <span className={css.prayerName}>{prayerName}</span>
          <div className={css.rakaBadge}>
            {t('session.raka')} <span>{Math.min(rakaNum, rakaTotal)}</span> / <span>{rakaTotal}</span>
          </div>
        </div>
        <div className={css.topbarRight}>
          <div className={`${css.poseBadge} ${css[poseBadgeState]}`}>
            {poseBadgeText}
          </div>
          <button type="button" className={css.endBtn} onClick={onEnd}>
            {t('session.end')}
          </button>
        </div>
      </div>

      {/* Video fills all remaining height; seq + mistakes overlay on top of it */}
      <VideoCanvas
        videoRef={videoRef}
        canvasRef={canvasRef}
        alert={alert}
        detectedLabel={detectedLabel}
        expectedLabel={expectedLabel}
        countdown={countdown}
      >
        {/* Sequence progress bar overlaid at top of video */}
        <div className={css.seqBar} aria-label="Prayer sequence progress">
          {sequence.map((step, i) => (
            <span key={`${step.pose}-${i}`}>
              <span
                title={step.label}
                className={`${css.seqStep}${i < stepIndex ? ` ${css.done}` : i === stepIndex ? ` ${css.current}` : ''}`}
              >
                {formatSeqLabel(step.label)}
              </span>
              {i < sequence.length - 1 && (
                <span className={css.seqArrow}>›</span>
              )}
            </span>
          ))}
        </div>

        {/* Recent mistakes overlaid at bottom-left of video */}
        {recentMistakes.length > 0 && (
          <div className={css.mistakesPanel}>
            <div className={css.mistakesTitle}>{t('session.recentMistakes')}</div>
            <div className={css.mistakeList}>
              {recentMistakes.map((chip, i) => (
                <span key={i} className={css.mistakeChip}>{chip}</span>
              ))}
            </div>
          </div>
        )}
      </VideoCanvas>
    </div>
  );
}
