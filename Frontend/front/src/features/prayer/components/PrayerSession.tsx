import { useAuth } from '../../auth/hooks/useAuth';
import { usePrayerSession } from '../hooks/usePrayerSession';
import IjazahRequired from './IjazahRequired';
import { PrayerSetup } from './PrayerSetup';
import { SessionUI } from './SessionUI';
import { PrayerReport } from './PrayerReport';
import css from './PrayerSession.module.css';

export function PrayerSession() {
  const { user } = useAuth();
  const {
    screen,
    loadingMsg,
    selectedPrayer,
    prayers,
    uiState,
    reportData,
    countdown,
    detectionActive,
    videoRef,
    canvasRef,
    selectPrayer,
    startPrayer,
    endPrayer,
    restart,
  } = usePrayerSession();

  // The gate sits here rather than on the route so someone arriving by link or
  // bookmark gets told what to do, instead of being redirected with no reason.
  // Admins are exempt: they grant the ijazah, they don't sit for it.
  if (user && user.role !== 'admin' && !user.fatihaIjazah) {
    return <IjazahRequired />;
  }

  if (screen === 'loading') {
    return (
      <div className={css.loading}>
        <div className={css.spinner} aria-hidden="true" />
        <div className={css.loadingMsg}>{loadingMsg}</div>
      </div>
    );
  }

  if (screen === 'session') {
    return (
      <SessionUI
        videoRef={videoRef}
        canvasRef={canvasRef}
        prayerId={selectedPrayer?.id ?? null}
        prayerName={selectedPrayer?.ar ?? ''}
        rakaNum={uiState.rakaNum}
        rakaTotal={uiState.rakaTotal}
        poseBadgeText={uiState.poseBadgeText}
        poseBadgeState={uiState.poseBadgeState}
        sequence={uiState.sequence}
        stepIndex={uiState.stepIndex}
        detectedLabel={uiState.detectedLabel}
        expectedLabel={uiState.expectedLabel}
        recentMistakes={uiState.recentMistakes}
        alert={uiState.alert}
        countdown={countdown}
        detectionActive={detectionActive}
        demoStep={uiState.demoStep}
        demoStepConfirmed={uiState.demoStepConfirmed}
        onEnd={() => endPrayer({ stopAudio: true })}
      />
    );
  }

  if (screen === 'report' && reportData) {
    return <PrayerReport data={reportData} onRestart={restart} />;
  }

  return (
    <PrayerSetup
      prayers={prayers}
      selected={selectedPrayer}
      onSelect={selectPrayer}
      onStart={startPrayer}
    />
  );
}
