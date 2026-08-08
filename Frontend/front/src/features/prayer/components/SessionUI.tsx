import type { RefObject } from 'react';
import type { PoseStep, PoseBadgeState, PrayerId } from '../types/prayer.types';
import type { Lang } from '../../../shared/i18n/translations';
import { useI18n } from '../../../shared/i18n/LanguageProvider';
import { useRecitationAyah } from '../hooks/useRecitationAyah';
import { useSessionPanels } from '../../../shared/session/SessionPanelsProvider';
import { PrayerModel3D } from './PrayerModel3D';
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
  prayerId: PrayerId | null;
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
  detectionActive: boolean;
  demoStep: PoseStep | null;
  demoStepConfirmed: boolean;
  onEnd: () => void;
}

export function SessionUI({
  videoRef, canvasRef,
  prayerId, prayerName, rakaNum, rakaTotal,
  poseBadgeText, poseBadgeState,
  sequence, stepIndex,
  detectedLabel, expectedLabel,
  recentMistakes, alert,
  countdown, detectionActive, demoStep, demoStepConfirmed,
  onEnd,
}: Props) {
  const { t, lang } = useI18n();

  // The movement the guide is demonstrating — held on the current posture until
  // its successor's name is spoken (driven by demoStep, not the raw stepIndex).
  const gifCaption = demoStep ? (lang === 'ar' ? demoStep.labelAr : demoStep.label) : '';

  // The ayah being recited right now (during qiyam), tracked from the audio clock.
  const currentAyah = useRecitationAyah();
  const { panels } = useSessionPanels();

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
      <div className={`${css.stage}${panels.camera ? '' : ` ${css.stageSolo}`}`}>
        {(panels.recitation || panels.model) && (
        <div className={css.teacher}>
          <div className={css.panelTag}>{t('session.teacher')}</div>

          {/* Top half: the ayah being recited right now (empty between recitations) */}
          {panels.recitation && (
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
          )}

          {/* Bottom half: the 3D movement demo */}
          {panels.model && (
          <div className={css.gifBox}>
            <PrayerModel3D
              prayerId={prayerId}
              movement={demoStep?.movement ?? null}
              rakaIndex={demoStep?.rakaIndex ?? rakaNum - 1}
              poseConfirmed={demoStepConfirmed}
              active={detectionActive}
            />
            {gifCaption && <div className={css.teacherCaption}>{gifCaption}</div>}
          </div>
          )}
        </div>
        )}

        {/* The camera panel can be switched off, but the <video> behind it must
            stay mounted and playing — MediaPipe reads its frames, so removing
            it would stop detection altogether. Hidden here means moved out of
            sight, never unmounted or display:none (which stops decoding). */}
        <div className={panels.camera ? css.cameraPane : css.cameraHidden}>
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
    </div>
  );
}
