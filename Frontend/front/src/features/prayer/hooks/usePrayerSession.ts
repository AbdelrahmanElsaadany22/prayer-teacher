import { useState, useRef, useCallback, useEffect } from 'react';
import type {
  Prayer, PoseType, AppScreen, PoseBadgeState,
  Mistake, PoseStep, ReportData,
} from '../types/prayer.types';
import { PRAYERS, POSE, buildRakaSequence } from '../constants/prayerConfig';
import { DEFAULT_RECITER_SERVER } from '../api/reciters.api';
import { getPoseLabel } from '../constants/poses';
import { audioService, type DhikrKey, type Transition } from '../services/audioService';
import { buildReportData } from '../services/prayerService';
import { useVideoStream } from './useVideoStream';
import { usePrayerRecorder } from './usePrayerRecorder';
import { usePoseDetection } from './usePoseDetection';
import { api } from '../../../shared/api/axios';
import { useI18n } from '../../../shared/i18n/LanguageProvider';
import { useReciter } from '../../../shared/reciter/ReciterProvider';

/**
 * Dhikr recited while holding a posture, played the moment the pose is reached.
 * Poses without a spoken dhikr (qiyam, i'tidal) return null and keep the beep.
 * The last tashahhud (final rak'ah) is followed by the tasleem.
 */
/** Maps a detected pose onto the expected step, resolving the display aliases. */
function resolveEffective(pose: PoseType, stepPose: PoseType): PoseType {
  if (pose === POSE.QIYAM && stepPose === POSE.IQAMA) return 'iqama';
  if (pose === POSE.JULOOS && stepPose === POSE.TASHAHHUD) return 'tashahhud';
  return pose;
}

function dhikrForPose(pose: PoseType, isLastRaka: boolean): DhikrKey[] | null {
  switch (pose) {
    case POSE.RUKU: return ['ruku'];
    case POSE.SUJOOD: return ['sujood'];
    case POSE.JULOOS: return ['juloos'];
    case POSE.TASHAHHUD:
      return isLastRaka ? ['tashahhud_akheer'] : ['tashahhud_awsat'];
    // The tasleem greeting plays once, the moment the head starts turning right;
    // the left salam has no separate clip (it just ends the prayer).
    case POSE.SALAM_RIGHT:
      return ['tasleem'];
    default: return null;
  }
}

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
  /**
   * The movement the guide GIF is currently demonstrating. Unlike {@link stepIndex}
   * (which advances the instant a pose is reached), this only moves on to the next
   * movement when its name is spoken — so while standing/reciting the guide keeps
   * showing the current posture, not the upcoming one.
   */
  demoStep: PoseStep | null;
  /**
   * Whether the learner has actually performed {@link demoStep} yet. False while it was
   * only just announced (the guide is demonstrating it ahead of time); true once the
   * learner has actually reached it (set alongside `stepIndex` advancing past it).
   */
  demoStepConfirmed: boolean;
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
  /** Latest stable detected pose — re-checked when a posture's content finishes. */
  lastStablePose: PoseType;
}

export function usePrayerSession() {
  const [screen, setScreen] = useState<AppScreen>('setup');
  const [loadingMsg, setLoadingMsg] = useState('Loading…');
  const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  // Flips true once the 5s countdown finishes and pose detection goes live — the 3D
  // guide's demo animation waits for this instead of starting the moment it mounts.
  const [detectionActive, setDetectionActive] = useState(false);
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
    demoStep: null,
    demoStepConfirmed: false,
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
    lastStablePose: 'unknown',
  });

  // Active language, mirrored into a ref so the detection callbacks (which are
  // memoised) always read the current value without being re-created.
  const { lang } = useI18n();
  const langRef = useRef(lang);
  langRef.current = lang;

  // Active reciter, mirrored into a ref for the same reason as langRef above.
  const { reciter } = useReciter();
  const reciterRef = useRef(reciter);
  reciterRef.current = reciter;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { videoRef, streamRef, startCamera, stopCamera } = useVideoStream();
  const { startRecording, stopRecording } = usePrayerRecorder(streamRef);
  const { initMediaPipe, startLoop, stopLoop, setCallbacks } = usePoseDetection(videoRef, canvasRef);

  // ─── Callbacks (kept stable but always read fresh sess.current) ───────────

  const endPrayer = useCallback(async (opts?: { stopAudio?: boolean }): Promise<void> => {
    stopLoop();
    // Ending early (the "End" button) silences everything; a natural finish
    // leaves the cue channel alone so the closing tasleem is still heard.
    if (opts?.stopAudio) audioService.stopCues();
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

      // Remember the live pose so re-evaluation (after a posture's content ends)
      // can tell whether the learner has already moved to the next posture.
      s.lastStablePose = pose;

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

  // Re-evaluation callback, filled in below. Held in a ref so acceptStep can hand
  // it to the audio service as an "on content finished" hook without a cycle.
  const reevalRef = useRef<() => void>(() => {});

  // Records a mistake (wrong pose, or moving on before the current one finished)
  // and flashes the alert, throttled by the shared cooldown.
  const registerMistake = useCallback(
    (s: SessionRefs, step: PoseStep, pose: PoseType, tooEarly: boolean): void => {
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
      let alertMsg: { ar: string; en: string };
      if (tooEarly) {
        // Moving on early. Ruku' is only ever due after the qiyam recitation, so a
        // too-early bow specifically means the recitation isn't finished yet.
        alertMsg = step.pose === POSE.RUKU
          ? { ar: 'أكملْ القراءة قبل الركوع', en: 'Finish the recitation before bowing' }
          : { ar: 'استنى تخلّص الحركة الحالية قبل ما تنتقل', en: 'Finish the current movement before moving on' };
      } else {
        alertMsg = {
          ar: `خطأ في ${step.labelAr}`,
          en: `Wrong for ${step.label} — detected: ${getPoseLabel(pose)}`,
        };
      }

      setUiState((prev) => ({
        ...prev,
        recentMistakes: [chip, ...prev.recentMistakes].slice(0, 8),
        alert: alertMsg,
      }));

      if (s.alertTimeout) clearTimeout(s.alertTimeout);
      s.alertTimeout = setTimeout(() => {
        setUiState((prev) => ({ ...prev, alert: null }));
      }, 1800);
    },
    [],
  );

  // Advances past the current (correctly-matched) step and plays its audio. The
  // step's own dhikr/recitation is what gates the *next* step, so each flow asks
  // to re-evaluate once its content finishes.
  const acceptStep = useCallback((): void => {
    const s = sess.current;
    const rakas = s.selectedPrayer?.rakas ?? 0;
    const seq = s.rakaSequences[s.rakaIndex];
    const step = seq?.[s.stepIndex];
    if (!step) return;

    // The guide now demonstrates the pose just reached; it stays on this one until
    // the "next movement is …" clip sounds (see onAnnounce below), never jumping
    // ahead while the learner is still holding/reciting the current posture. The
    // learner just performed it, so it's confirmed — the 3D demo stops looping and
    // holds on this movement's timestamp.
    setUiState((prev) => ({ ...prev, demoStep: step, demoStepConfirmed: true }));

    // Capture the reached pose + its position before advancing, so the dhikr
    // (and middle-vs-last tashahhud) reflect what actually happened.
    const performedPose = step.pose;
    const reachedStepIndex = s.stepIndex;
    const isLastRaka = s.rakaIndex === rakas - 1;
    const dhikr = dhikrForPose(performedPose, isLastRaka) ?? undefined;

    // The takbir / "Sami' Allah" said while moving INTO this pose. Rising from
    // ruku' (i'tidal) is "Sami' Allah"; the tasleem turns get none; everything
    // else is the takbir. Qiyam straight after takbeerat al-ihram gets none — the
    // opening takbir already brought the learner up — while a new rak'ah's qiyam
    // gets the rising takbir.
    const qiyamAfterTakbeer =
      performedPose === POSE.QIYAM &&
      reachedStepIndex > 0 &&
      seq[reachedStepIndex - 1]?.pose === POSE.TAKBEER;
    let transition: Transition | null;
    if (performedPose === POSE.QIYAM) transition = qiyamAfterTakbeer ? null : 'takbir';
    else if (performedPose === POSE.SALAM_RIGHT || performedPose === POSE.SALAM_LEFT) transition = null;
    else transition = performedPose === POSE.IQAMA ? 'sami' : 'takbir';

    // Reaching qiyam plays the Qur'an recitation (chosen reciter) as its content.
    // The default reciter's server is sent explicitly (not left null) so its audio
    // never collides with the stale bare `/recitation/N` cache, and always matches
    // the ayah-timing lookup, without depending on the backend's default.
    const recite =
      performedPose === POSE.QIYAM
        ? {
            rakaIndex: s.rakaIndex,
            reciterServer: reciterRef.current?.server ?? DEFAULT_RECITER_SERVER,
          }
        : null;

    // Takbeerat al-ihram is the trigger that actually starts evaluation.
    if (performedPose === POSE.TAKBEER) s.prayerStarted = true;

    s.stepIndex++;

    if (s.stepIndex >= seq.length) {
      s.rakaIndex++;
      s.stepIndex = 0;

      if (s.rakaIndex >= rakas) {
        // Final movement: play its closing audio, then end (close the camera,
        // show the report) only once that audio finishes.
        audioService.playFlow({
          lang: langRef.current,
          transition,
          dhikr,
          onDone: () => { void endPrayer(); },
        });
        return;
      }
    }

    const nextSeq = s.rakaSequences[s.rakaIndex];
    const upcoming = nextSeq?.[s.stepIndex];

    // Announce the next movement by NAME only — its own transition sound plays
    // when the learner actually reaches it, never ahead of time. Takbeer is
    // never announced; qiyam is announced only when a new rak'ah is starting
    // (not right after takbeerat al-ihram, where the learner is already up).
    let announceNext: string | null = null;
    if (upcoming && upcoming.pose !== POSE.TAKBEER) {
      if (upcoming.pose === POSE.QIYAM) {
        announceNext = performedPose === POSE.TAKBEER ? null : upcoming.pose;
      } else if (upcoming.pose === POSE.TASHAHHUD) {
        // The tashahhud always closes the current rak'ah (2nd sujood → it, no
        // wrap), so isLastRaka still describes it — pick middle vs last clip.
        announceNext = isLastRaka ? 'tashahhud_akheer' : 'tashahhud_awsat';
      } else if (upcoming.pose === POSE.SALAM_RIGHT) {
        // Announce the tasleem once, before the right salam; the left salam is
        // the same greeting turned the other way, so it isn't re-announced.
        announceNext = 'tasleem';
      } else if (upcoming.pose === POSE.SALAM_LEFT) {
        announceNext = null;
      } else {
        announceNext = upcoming.pose;
      }
    }

    audioService.playFlow({
      lang: langRef.current,
      transition,
      dhikr,
      recite,
      announceNext,
      // Once this posture's content ends, the learner may already be holding the
      // next one — re-check and advance if so.
      onDone: () => reevalRef.current(),
      // The instant the spoken "next movement is …" begins, switch the guide GIF
      // to that movement — so its demo appears exactly on the announcement. It hasn't
      // been performed yet, so the 3D demo loops the lead-up to it until it has.
      onAnnounce: () => setUiState((prev) => ({
        ...prev,
        demoStep: upcoming ?? prev.demoStep,
        demoStepConfirmed: upcoming ? false : prev.demoStepConfirmed,
      })),
    });

    setUiState((prev) => ({
      ...prev,
      rakaNum: Math.min(s.rakaIndex + 1, s.selectedPrayer?.rakas ?? 1),
      sequence: nextSeq ?? [],
      stepIndex: s.stepIndex,
    }));
  }, [endPrayer]);

  // After a posture's content finishes, advance if the learner is already in the
  // next posture — silently (this path never records a mistake).
  const reeval = useCallback((): void => {
    const s = sess.current;
    const rakas = s.selectedPrayer?.rakas ?? 0;
    if (s.rakaIndex >= rakas || audioService.isHolding()) return;
    const step = s.rakaSequences[s.rakaIndex]?.[s.stepIndex];
    if (!step) return;
    if (resolveEffective(s.lastStablePose, step.pose) === step.pose) acceptStep();
  }, [acceptStep]);
  reevalRef.current = reeval;

  // Called once per new stable pose — handles step advancement + mistakes
  const onNewStablePose = useCallback(
    (pose: PoseType): void => {
      const s = sess.current;
      const rakas = s.selectedPrayer?.rakas ?? 0;
      if (s.rakaIndex >= rakas) return;

      const seq = s.rakaSequences[s.rakaIndex];
      const step = seq?.[s.stepIndex];
      if (!step) return;

      const effective = resolveEffective(pose, step.pose);

      if (effective === step.pose) {
        // Qiyam straight after takbeerat al-ihram is the natural start (lowering in
        // during the opening takbir), never "moving on early", so it isn't gated.
        const afterTakbeer =
          step.pose === POSE.QIYAM && s.stepIndex > 0 && seq[s.stepIndex - 1]?.pose === POSE.TAKBEER;
        // The current posture isn't "done" until its entry phrase + dhikr/recitation
        // finish — moving on before then is a mistake, not an advance. Once it ends,
        // reeval() picks up the pose the learner is now in.
        if (audioService.isHolding() && !afterTakbeer) {
          registerMistake(s, step, pose, true);
          return;
        }
        acceptStep();
        return;
      }

      // ── Wrong pose ────────────────────────────────────────────────────────
      // Standing when a bow is due just means "hasn't bowed yet" — e.g. waiting
      // for the recitation to end — so never flag qiyam while ruku' is expected.
      if (pose === POSE.QIYAM && step.pose === POSE.RUKU) return;

      const expectingSalam = step.pose === POSE.SALAM_RIGHT || step.pose === POSE.SALAM_LEFT;
      // A head turn outside the tasleem is just the learner glancing — ignore it.
      if ((pose === POSE.SALAM_RIGHT || pose === POSE.SALAM_LEFT) && !expectingSalam) return;
      // Facing forward between the two salams is the natural mid-turn, not an error.
      if (pose === POSE.JULOOS && expectingSalam) return;

      // Don't penalize until takbeerat al-ihram has been performed —
      // give the user a grace period to raise their hands and begin.
      if (!s.prayerStarted) return;

      registerMistake(s, step, pose, false);
    },
    [acceptStep, registerMistake],
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
        setCountdown(5); // begin 10-second countdown before detection starts
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
      setDetectionActive(true);
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
      setDetectionActive(false);
      audioService.resetRecitation(); // no surah carry-over between prayers
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
        demoStep: firstSeq?.[0] ?? null,
        demoStepConfirmed: false,
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
    detectionActive,
    videoRef,
    canvasRef,
    selectPrayer,
    startPrayer,
    endPrayer,
    restart,
  };
}
