import { useState, useRef, useCallback, useEffect } from 'react';
import type {
  Prayer, PoseType, AppScreen, PoseBadgeState,
  Mistake, PoseStep, ReportData,
} from '../types/prayer.types';
import { PRAYERS, POSE, buildRakaSequence } from '../constants/prayerConfig';
import { getPoseLabel } from '../constants/poses';
import { audioService } from '../services/audioService';
import { buildReportData } from '../services/prayerService';
import { useVideoStream } from './useVideoStream';
import { usePrayerRecorder } from './usePrayerRecorder';
import { usePoseDetection } from './usePoseDetection';
import { api } from '../../../shared/api/axios';
import { useI18n } from '../../../shared/i18n/LanguageProvider';

export interface SessionUIState {
  poseBadgeText: string;
  poseBadgeState: PoseBadgeState;
  detectedLabel: string;
  expectedLabel: string;
  rakaNum: number;
  rakaTotal: number;
  sequence: PoseStep[];
  stepIndex: number;
  recentMistakes: string[];
  alert: { ar: string; en: string } | null;
}

interface SessionRefs {
  rakaIndex: number;
  stepIndex: number;
  rakaSequences: PoseStep[][];
  allMistakes: Mistake[];
  lastAlertTime: number;
  sessionStartTime: number;
  selectedPrayer: Prayer | null;
  alertTimeout: ReturnType<typeof setTimeout> | null;
  prayerStarted: boolean;
}

export function usePrayerSession() {
  const [screen, setScreen] = useState<AppScreen>('setup');
  const [loadingMsg, setLoadingMsg] = useState('Loading…');
  const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [uiState, setUiState] = useState<SessionUIState>({
    poseBadgeText: 'Detecting…',
    poseBadgeState: 'waiting',
    detectedLabel: '—',
    expectedLabel: '—',
    rakaNum: 1,
    rakaTotal: 0,
    sequence: [],
    stepIndex: 0,
    recentMistakes: [],
    alert: null,
  });

  // Session data accessed by callbacks (no stale closures)
  const sess = useRef<SessionRefs>({
    rakaIndex: 0,
    stepIndex: 0,
    rakaSequences: [],
    allMistakes: [],
    lastAlertTime: 0,
    sessionStartTime: 0,
    selectedPrayer: null,
    alertTimeout: null,
    prayerStarted: false,
  });

  // Active language, mirrored into a ref so the detection callbacks (which are
  // memoised) always read the current value without being re-created.
  const { lang } = useI18n();
  const langRef = useRef(lang);
  langRef.current = lang;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { videoRef, streamRef, startCamera, stopCamera } = useVideoStream();
  const { startRecording, stopRecording } = usePrayerRecorder(streamRef);
  const { initMediaPipe, startLoop, stopLoop, setCallbacks } = usePoseDetection(videoRef, canvasRef);

  // ─── Callbacks (kept stable but always read fresh sess.current) ───────────

  const endPrayer = useCallback(async (): Promise<void> => {
    stopLoop();
    const videoBlob = await stopRecording();
    stopCamera();

    const s = sess.current;
    const report = buildReportData(
      s.selectedPrayer!,
      s.rakaSequences,
      s.rakaIndex,
      s.allMistakes,
      s.sessionStartTime,
      videoBlob,
    );

    api.post('/prayer', {
      prayerName: report.prayerName,
      rakas: report.rakas,
      accuracy: report.accuracy,
      duration: report.duration,
      mistakes: report.mistakes,
      mistakeDetails: report.mistakeDetails,
    }).catch(() => {  });//عشان الباك ياحبسة

    setReportData(report);
    setScreen('report');
  }, [stopLoop, stopRecording, stopCamera]);

  // Called every frame for badge/label UI
  const onPoseUpdate = useCallback(
    (pose: PoseType, hasLandmarks: boolean): void => {
      const s = sess.current;
      const seq = s.rakaSequences[s.rakaIndex];
      const step = seq?.[s.stepIndex];

      const lng = langRef.current;
      const stepLabel = step ? (lng === 'ar' ? step.labelAr : step.label) : '—';

      if (!hasLandmarks || pose === 'unknown') {
        setUiState((prev) => ({
          ...prev,
          poseBadgeText: lng === 'ar' ? 'جارٍ الكشف…' : 'Detecting…',
          poseBadgeState: 'waiting',
          detectedLabel: '—',
          expectedLabel: stepLabel,
        }));
        return;
      }

      // Resolve pose aliases for display
      let effective = pose;
      if (pose === POSE.QIYAM && step?.pose === POSE.IQAMA) effective = 'iqama';
      if (pose === POSE.JULOOS && step?.pose === POSE.TASHAHHUD) effective = 'tashahhud';

      let badgeText: string;
      let badgeState: PoseBadgeState;

      if (!step) {
        badgeText = getPoseLabel(pose, lng);
        badgeState = 'waiting';
      } else if (effective === step.pose) {
        badgeText = `✓ ${getPoseLabel(pose, lng)}`;
        badgeState = 'correct';
      } else {
        badgeText = `✗ ${getPoseLabel(pose, lng)}`;
        badgeState = 'wrong';
      }

      setUiState((prev) => ({
        ...prev,
        poseBadgeText: badgeText,
        poseBadgeState: badgeState,
        detectedLabel: getPoseLabel(pose, lng),
        expectedLabel: stepLabel,
      }));
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Called once per new stable pose — handles step advancement + mistakes
  const onNewStablePose = useCallback(
    (pose: PoseType): void => {
      const s = sess.current;
      if (s.rakaIndex >= (s.selectedPrayer?.rakas ?? 0)) return;

      const seq = s.rakaSequences[s.rakaIndex];
      const step = seq?.[s.stepIndex];
      if (!step) return;

      // Resolve aliases
      let effective = pose;
      if (pose === POSE.QIYAM && step.pose === POSE.IQAMA) effective = 'iqama';
      if (pose === POSE.JULOOS && step.pose === POSE.TASHAHHUD) effective = 'tashahhud';

      if (effective === step.pose) {
        // ── Correct pose ──────────────────────────────────────────────────────
        // Takbeerat al-ihram is the trigger that actually starts evaluation
        if (step.pose === POSE.TAKBEER) s.prayerStarted = true;
        audioService.playSuccessBeep();
        s.stepIndex++;

        if (s.stepIndex >= seq.length) {
          s.rakaIndex++;
          s.stepIndex = 0;

          if (s.rakaIndex >= (s.selectedPrayer?.rakas ?? 0)) {
            setTimeout(() => endPrayer(), 800);
            return;
          }
        }

        const nextSeq = s.rakaSequences[s.rakaIndex];

        // Voice guidance: announce the movement now due (skip takbeer —
        // the user initiates takbeerat al-ihram themselves, it's the trigger)
        const upcoming = nextSeq?.[s.stepIndex];
        if (upcoming && upcoming.pose !== POSE.TAKBEER) {
          // "The next move is" + the movement name pronounced in Arabic
          audioService.speakCue(upcoming.pose);
        }

        setUiState((prev) => ({
          ...prev,
          rakaNum: Math.min(s.rakaIndex + 1, s.selectedPrayer?.rakas ?? 1),
          sequence: nextSeq ?? [],
          stepIndex: s.stepIndex,
        }));
      } else {
        // ── Wrong pose ────────────────────────────────────────────────────────
        // Don't penalize until takbeerat al-ihram has been performed —
        // give the user a grace period to raise their hands and begin.
        if (!s.prayerStarted) return;

        const now = Date.now();
        if (now - s.lastAlertTime < 1800) return;
        s.lastAlertTime = now;

        const elapsed = Math.floor((now - s.sessionStartTime) / 1000);
        const mistake: Mistake = {
          rakaIndex: s.rakaIndex + 1,
          stepLabel: step.label,
          stepLabelAr: step.labelAr,
          detectedPose: pose,
          time: elapsed,
          ts: now,
        };
        s.allMistakes.push(mistake);
        audioService.playMistakeBeep();

        const chip = `R${mistake.rakaIndex} ${step.label}`;
        const alertMsg = {
          ar: `خطأ في ${step.labelAr}`,
          en: `Wrong for ${step.label} — detected: ${getPoseLabel(pose)}`,
        };

        setUiState((prev) => ({
          ...prev,
          recentMistakes: [chip, ...prev.recentMistakes].slice(0, 8),
          alert: alertMsg,
        }));

        if (s.alertTimeout) clearTimeout(s.alertTimeout);
        s.alertTimeout = setTimeout(() => {
          setUiState((prev) => ({ ...prev, alert: null }));
        }, 1800);
      }
    },
    [endPrayer], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Keep detection callbacks fresh every render
  useEffect(() => {
    setCallbacks(onNewStablePose, onPoseUpdate);
  });

  // After session screen renders, the <video> element is mounted — start camera + countdown
  const pendingCameraRef = useRef(false);

  useEffect(() => {
    if (screen !== 'session' || !pendingCameraRef.current) return;
    pendingCameraRef.current = false;

    startCamera()
      .then(() => {
        startRecording();
        setCountdown(10); // begin 10-second countdown before detection starts
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        setLoadingMsg(`Error: ${msg}`);
        setScreen('loading');
      });
  }, [screen, startCamera, startRecording]);

  // Countdown tick — starts detection loop when it reaches 0
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      startLoop();
      return;
    }
    const id = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(id);
  }, [countdown, startLoop]);

  // ─── Public API ────────────────────────────────────────────────────────────

  const selectPrayer = useCallback((prayer: Prayer): void => {
    setSelectedPrayer(prayer);
  }, []);

  const startPrayer = useCallback(async (): Promise<void> => {
    const prayer = selectedPrayer;
    if (!prayer) return;

    setScreen('loading');

    try {
      await initMediaPipe(setLoadingMsg);

      // Reset session refs
      const s = sess.current;
      s.rakaIndex = 0;
      s.stepIndex = 0;
      s.allMistakes = [];
      s.lastAlertTime = 0;
      s.sessionStartTime = Date.now();
      s.selectedPrayer = prayer;
      s.prayerStarted = false;
      s.rakaSequences = Array.from({ length: prayer.rakas }, (_, i) =>
        buildRakaSequence(i, prayer.rakas),
      );

      const firstSeq = s.rakaSequences[0];

      setUiState({
        poseBadgeText: 'Detecting…',
        poseBadgeState: 'waiting',
        detectedLabel: '—',
        expectedLabel: firstSeq?.[0]?.label ?? '—',
        rakaNum: 1,
        rakaTotal: prayer.rakas,
        sequence: firstSeq ?? [],
        stepIndex: 0,
        recentMistakes: [],
        alert: null,
      });

      // Signal camera start, then switch screen.
      // useEffect fires after React renders <video> into the DOM.
      pendingCameraRef.current = true;
      setScreen('session');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLoadingMsg(`Error: ${msg}`);
    }
  }, [selectedPrayer, initMediaPipe]);

  const restart = useCallback((): void => {
    setSelectedPrayer(null);
    setReportData(null);
    setScreen('setup');
  }, []);

  return {
    screen,
    loadingMsg,
    selectedPrayer,
    prayers: PRAYERS,
    uiState,
    reportData,
    countdown,
    videoRef,
    canvasRef,
    selectPrayer,
    startPrayer,
    endPrayer,
    restart,
  };
}
