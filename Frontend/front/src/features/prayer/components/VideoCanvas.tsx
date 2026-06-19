import type { RefObject, ReactNode } from 'react';
import { useI18n } from '../../../shared/i18n/LanguageProvider';
import css from './VideoCanvas.module.css';

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  alert: { ar: string; en: string } | null;
  detectedLabel: string;
  expectedLabel: string;
  countdown: number | null;
  children?: ReactNode;
}

export function VideoCanvas({ videoRef, canvasRef, alert, detectedLabel, expectedLabel, countdown, children }: Props) {
  const { t } = useI18n();

  return (
    <div className={css.wrapper}>
      <video
        ref={videoRef}
        className={css.video}
        autoPlay
        playsInline
        muted
        aria-hidden="true"
      />
      <canvas ref={canvasRef} className={css.canvas} aria-hidden="true" />

      {/* Overlay children (seqBar, mistakesPanel) from SessionUI */}
      {children}

      {/* Countdown overlay */}
      {countdown !== null && (
        <div className={css.countdownOverlay} aria-live="polite">
          <span key={countdown} className={css.countdownNum}>{countdown}</span>
          <span className={css.countdownLabel}>{t('session.getReady')}</span>
        </div>
      )}

      {/* Mistake alert overlay (only when not counting down) */}
      {countdown === null && (
        <div
          className={`${css.alertOverlay}${alert ? ` ${css.visible}` : ''}`}
          aria-live="assertive"
          aria-atomic="true"
        >
          {alert && (
            <div className={css.alertBox}>
              <span className={css.alertAr}>{alert.ar}</span>
              <span>{alert.en}</span>
            </div>
          )}
        </div>
      )}

      <div className={css.labelBar}>
        <div className={css.detectedLabel}>
          {t('session.detected')}: <strong>{countdown !== null ? '—' : detectedLabel}</strong>
        </div>
        <div className={css.expectedLabel}>
          {t('session.expected')}: <strong>{countdown !== null ? '—' : expectedLabel}</strong>
        </div>
      </div>
    </div>
  );
}
