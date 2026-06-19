import type { PoseLandmarker, DrawingUtils, FilesetResolver } from '@mediapipe/tasks-vision';
import { MEDIAPIPE_CONFIG } from '../constants/prayerConfig';

type VisionMod = {
  PoseLandmarker: typeof PoseLandmarker;
  FilesetResolver: typeof FilesetResolver;
  DrawingUtils: typeof DrawingUtils;
};

// Internal connection type mirrors mediapipe's non-exported Connection interface
export type PoseConnections = { start: number; end: number }[];

let modPromise: Promise<VisionMod> | null = null;
let poseConnections: PoseConnections | null = null;

function getModule(): Promise<VisionMod> {
  if (!modPromise) {
    modPromise = import('@mediapipe/tasks-vision') as Promise<VisionMod>;
  }
  return modPromise;
}

export async function createPoseLandmarker(): Promise<PoseLandmarker> {
  const { PoseLandmarker, FilesetResolver } = await getModule();
  poseConnections = PoseLandmarker.POSE_CONNECTIONS as unknown as PoseConnections;

  const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_CONFIG.WASM_URL);
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MEDIAPIPE_CONFIG.MODEL_URL,
      delegate: MEDIAPIPE_CONFIG.DELEGATE,
    },
    runningMode: MEDIAPIPE_CONFIG.RUNNING_MODE,
    numPoses: MEDIAPIPE_CONFIG.NUM_POSES,
    minPoseDetectionConfidence: MEDIAPIPE_CONFIG.MIN_DETECTION_CONFIDENCE,
    minPosePresenceConfidence: MEDIAPIPE_CONFIG.MIN_PRESENCE_CONFIDENCE,
    minTrackingConfidence: MEDIAPIPE_CONFIG.MIN_TRACKING_CONFIDENCE,
  });
}

export async function createDrawingUtils(ctx: CanvasRenderingContext2D): Promise<DrawingUtils> {
  const { DrawingUtils } = await getModule();
  return new DrawingUtils(ctx);
}

export function getPoseConnections(): PoseConnections | null {
  return poseConnections;
}
