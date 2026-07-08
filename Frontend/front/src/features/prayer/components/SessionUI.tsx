import type { RefObject } from 'react';
import type { PoseStep, PoseBadgeState } from '../types/prayer.types';
import type { Lang } from '../../../shared/i18n/translations';
import { useI18n } from '../../../shared/i18n/LanguageProvider';
import { POSE_GIFS } from '../constants/poseGifs';
import { useRecitationAyah } from '../hooks/useRecitationAyah';
import { VideoCanvas } from './VideoCanvas';
import css from './SessionUI.module.css';

/** Short chip label for the sequence bar, abbreviating the long names per language. */
function formatSeqLabel(step: PoseStep, lang: Lang): string {
  if (lang === 'ar') {
    const arShort: Record<string, string> = {
      'تكبيرة الإحرام': 'التكبير',
      'التسليم يمينًا': 'تسليم يمين',
      'التسليم يسارًا': 'تسليم يسار',
    };
    return arShort[step.labelAr] ?? step.labelAr;
  }
  return step.label
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
  demoStep: PoseStep | null;
  onEnd: () => void;
}

export function SessionUI({
  videoRef, canvasRef,
  prayerName, rakaNum, rakaTotal,
  poseBadgeText, poseBadgeState,
  sequence, stepIndex,
  detectedLabel, expectedLabel,
  recentMistakes, alert,
  countdown, demoStep,
  onEnd,
}: Props) {
  const { t, lang } = useI18n();

  // The movement the guide is demonstrating — held on the current posture until
  // its successor's name is spoken (driven by demoStep, not the raw stepIndex).
  const gifSrc = demoStep?.gif ? POSE_GIFS[demoStep.gif] : null;
  const gifCaption = demoStep ? (lang === 'ar' ? demoStep.labelAr : demoStep.label) : '';

  // The ayah being recited right now (during qiyam), tracked from the audio clock.
  const currentAyah = useRecitationAyah();

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

      {/* Split stage: the guide's GIF on one side, the live camera on the other */}
      <div className={css.stage}>
        <div className={css.teacher}>
          <div className={css.panelTag}>{t('session.teacher')}</div>

          {/* Top half: the ayah being recited right now (empty between recitations) */}
          <div className={css.ayahBox} dir="rtl" aria-live="polite">
            {currentAyah ? (
              <p key={`${currentAyah.surah}:${currentAyah.number}`} className={css.ayahText}>
                {currentAyah.text}
                {currentAyah.number > 0 && (
                  <span className={css.ayahMark}> ﴿{currentAyah.number}﴾</span>
                )}
              </p>
            ) : (
              <span className={css.ayahIdle} aria-hidden="true">﷽</span>
            )}
          </div>

          {/* Bottom half: the movement demo GIF */}
          <div className={css.gifBox}>
            {gifSrc ? (
              /* key forces a fresh <img> per movement so the GIF restarts each time */
              <img key={gifSrc} src={gifSrc} className={css.teacherGif} alt={gifCaption} />
            ) : (
              <div className={css.teacherGif} aria-hidden="true" />
            )}
            {gifCaption && <div className={css.teacherCaption}>{gifCaption}</div>}
          </div>
        </div>

        {/* Video fills its half; seq + mistakes overlay on top of it */}
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
                title={lang === 'ar' ? step.labelAr : step.label}
                className={`${css.seqStep}${i < stepIndex ? ` ${css.done}` : i === stepIndex ? ` ${css.current}` : ''}`}
              >
                {formatSeqLabel(step, lang)}
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
    </div>
  );
}
