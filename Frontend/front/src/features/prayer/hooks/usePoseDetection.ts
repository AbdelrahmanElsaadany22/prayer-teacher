import { useRef, useCallback } from 'react';
import type { RefObject } from 'react';
import { createPoseLandmarker, createDrawingUtils, getPoseConnections } from '../services/mediapipeService';
import { classifyPose } from '../services/poseClassifier';
import { CONFIG } from '../constants/prayerConfig';
import type { PoseType } from '../types/prayer.types';

export type OnNewStablePose = (pose: PoseType) => void;
export type OnPoseUpdate = (pose: PoseType, hasLandmarks: boolean) => void;

export function usePoseDetection(
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
) {
  const landmarkerRef = useRef<Awaited<ReturnType<typeof createPoseLandmarker>> | null>(null);
  const drawingRef = useRef<Awaited<ReturnType<typeof createDrawingUtils>> | null>(null);
  const animRef = useRef<number | null>(null);

  // Pose debounce state — lives in a ref so the loop never has stale values
  const db = useRef({
    current: 'unknown' as PoseType,
    prev: 'unknown' as PoseType,
    holdMs: 0,
    lastChangeTime: 0,
    lastFrameTime: 0,
  });

  // Callback refs — always up-to-date without needing them in deps
  const onNewRef = useRef<OnNewStablePose>(() => {});
  const onUpdateRef = useRef<OnPoseUpdate>(() => {});

  const setCallbacks = useCallback(
    (onNew: OnNewStablePose, onUpdate: OnPoseUpdate): void => {
      onNewRef.current = onNew;
      onUpdateRef.current = onUpdate;
    },
    [],
  );

  const drawingInitRef = useRef(false);

  const initMediaPipe = useCallback(
    async (onProgress: (msg: string) => void): Promise<void> => {
      onProgress('Downloading AI pose model (first run)…');
      landmarkerRef.current = await createPoseLandmarker();
      drawingInitRef.current = false; // reset so loop re-inits with the live canvas
    },
    [],
  );

  const startLoop = useCallback((): void => {
    const loop = (timestamp: number) => {
      animRef.current = requestAnimationFrame(loop);

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;
      const d = db.current;

      if (
        !video || !canvas || !landmarker ||
        video.readyState < 2 ||
        timestamp - d.lastFrameTime < CONFIG.FRAME_INTERVAL_MS
      ) return;

      d.lastFrameTime = timestamp;

      if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

      // Lazy-init DrawingUtils after canvas is mounted and sized
      if (!drawingInitRef.current) {
        drawingInitRef.current = true;
        const ctx = canvas.getContext('2d');
        if (ctx) createDrawingUtils(ctx).then((du) => { drawingRef.current = du; });
      }

      try {
        const results = landmarker.detectForVideo(video, timestamp);

        if (!results?.landmarks?.length) {
          onUpdateRef.current('unknown', false);
          return;
        }

        const landmarks = results.landmarks[0];

        // Draw skeleton
        const du = drawingRef.current;
        if (du) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            du.drawLandmarks(landmarks, {
              color: '#c9a84c',
              fillColor: '#c9a84c',
              lineWidth: 2,
              radius: 3,
            });
            const conns = getPoseConnections();
            if (conns) {
              du.drawConnectors(landmarks, conns, {
                color: 'rgba(201,168,76,0.55)',
                lineWidth: 2,
              });
            }
          }
        }

        // Classify + debounce
        const raw = classifyPose(landmarks);

        if (raw !== d.prev) {
          d.prev = raw;
          d.holdMs = 0;
          d.lastChangeTime = timestamp;
        } else {
          d.holdMs = timestamp - d.lastChangeTime;
        }

        const stable: PoseType =
          d.holdMs >= CONFIG.HOLD_THRESHOLD_MS ? raw : d.current;

        // Fire "new stable pose" only when the stable pose changes
        if (stable !== d.current && stable !== 'unknown') {
          d.current = stable;
          onNewRef.current(stable);
        }

        // Always fire frame update for UI
        onUpdateRef.current(d.current, true);
      } catch (err) {
        console.error('Pose detection error:', err);
      }
    };

    animRef.current = requestAnimationFrame(loop);
  }, [videoRef, canvasRef]);

  const stopLoop = useCallback((): void => {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    // Reset debounce for next session
    const d = db.current;
    d.current = 'unknown';
    d.prev = 'unknown';
    d.holdMs = 0;
    d.lastChangeTime = 0;
    d.lastFrameTime = 0;
  }, []);

  return { initMediaPipe, startLoop, stopLoop, setCallbacks };
}
