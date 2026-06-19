import type { Prayer, PoseStep, PoseType } from '../types/prayer.types';

export const PRAYERS: Prayer[] = [
  { id: 'fajr', ar: 'الفجر', en: 'Fajr', rakas: 2 },
  { id: 'zuhr', ar: 'الظهر', en: 'Zuhr', rakas: 4 },
  { id: 'asr', ar: 'العصر', en: 'Asr', rakas: 4 },
  { id: 'maghrib', ar: 'المغرب', en: 'Maghrib', rakas: 3 },
  { id: 'isha', ar: 'العشاء', en: 'Isha', rakas: 4 },
];

export const POSE: Record<string, PoseType> = {
  UNKNOWN: 'unknown',
  QIYAM: 'qiyam',
  TAKBEER: 'takbeer',
  RUKU: 'ruku',
  SUJOOD: 'sujood',
  IQAMA: 'iqama',
  JULOOS: 'juloos',
  TASHAHHUD: 'tashahhud',
};

export const LANDMARKS = {
  NOSE: 0,
  L_EAR: 7,
  R_EAR: 8,
  L_SHOULDER: 11,
  R_SHOULDER: 12,
  L_ELBOW: 13,
  R_ELBOW: 14,
  L_WRIST: 15,
  R_WRIST: 16,
  L_HIP: 23,
  R_HIP: 24,
  L_KNEE: 25,
  R_KNEE: 26,
  L_ANKLE: 27,
  R_ANKLE: 28,
} as const;

export const CONFIG = {
  HOLD_THRESHOLD_MS: 600,
  ALERT_COOLDOWN_MS: 1800,
  MIN_VISIBILITY: 0.35,
  FRAME_INTERVAL_MS: 80,
  VIDEO_WIDTH: 640,
  VIDEO_HEIGHT: 480,
} as const;

export const MEDIAPIPE_CONFIG = {
  MODEL_URL:
    'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  WASM_URL: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm',
  RUNNING_MODE: 'VIDEO' as const,
  NUM_POSES: 1,
  MIN_DETECTION_CONFIDENCE: 0.55,
  MIN_PRESENCE_CONFIDENCE: 0.55,
  MIN_TRACKING_CONFIDENCE: 0.55,
  DELEGATE: 'GPU' as const,
} as const;

export function buildRakaSequence(rakaIndex: number, totalRakas: number): PoseStep[] {
  const isFirst = rakaIndex === 0;
  const isLast = rakaIndex === totalRakas - 1;
  const endsWithTashahhud =
    isLast ||
    (totalRakas === 3 && rakaIndex === 1) ||
    (totalRakas >= 4 && rakaIndex === 1);

  const seq: PoseStep[] = [];

  if (isFirst) {
    seq.push({ pose: 'takbeer', label: 'Takbeer', labelAr: 'تكبيرة الإحرام' });
  }

  seq.push({ pose: 'qiyam', label: 'Qiyam', labelAr: 'القيام' });
  seq.push({ pose: 'ruku', label: "Ruku'", labelAr: 'الركوع' });
  seq.push({ pose: 'iqama', label: "I'tidal", labelAr: 'الاعتدال' });
  seq.push({ pose: 'sujood', label: 'Sujood 1', labelAr: 'السجود' });
  seq.push({ pose: 'juloos', label: 'Juloos', labelAr: 'الجلسة' });
  seq.push({ pose: 'sujood', label: 'Sujood 2', labelAr: 'السجود' });

  if (endsWithTashahhud) {
    seq.push({ pose: 'tashahhud', label: 'Tashahhud', labelAr: 'التشهد' });
  }

  return seq;
}
