import type { GifKey } from '../constants/poseGifs';

export type PoseType =
  | 'unknown'
  | 'qiyam'
  | 'takbeer'
  | 'ruku'
  | 'sujood'
  | 'iqama'
  | 'juloos'
  | 'tashahhud'
  | 'salam_right'
  | 'salam_left';

/** The five daily prayers — see constants/movement-timeline-guide.md for the full naming reference. */
export type PrayerId = 'fajr' | 'zuhr' | 'asr' | 'maghrib' | 'isha';

/**
 * A single named movement within a rak'ah, unique enough to key the 3D demo's
 * timing table (constants/movementTimeline.ts) — unlike {@link PoseType}, the two
 * prostrations of a rak'ah get distinct names ('sujood1'/'sujood2') since each
 * holds at a different point in the model's baked animation.
 */
export type MovementName =
  | 'takbeer'
  | 'qiyam'
  | 'ruku'
  | 'iqama'
  | 'sujood1'
  | 'juloos'
  | 'sujood2'
  | 'tashahhud'
  | 'salam_right'
  | 'salam_left';

export interface Prayer {
  id: PrayerId;
  ar: string;
  en: string;
  rakas: number;
}

export interface PoseStep {
  pose: PoseType;
  label: string;
  labelAr: string;
  /** Teacher-demo GIF shown while this movement is the one still expected. */
  gif?: GifKey;
  /** Key into {@link MOVEMENT_TIMELINE} for this exact movement instance. */
  movement: MovementName;
  /**
   * 0-based rak'ah this step belongs to — carried on the step itself (rather than
   * read from the session's live `rakaIndex`/`rakaNum`) because that counter
   * advances to the *next* rak'ah as soon as this step is confirmed, before the
   * guide (`demoStep`) actually catches up to showing the next rak'ah's first
   * movement. Reading the raka off the step keeps the 3D demo's timeline lookup
   * (prayer + raka + movement) in sync with whichever movement it's actually
   * displaying at that moment.
   */
  rakaIndex: number;
}

export interface Mistake {
  rakaIndex: number;
  stepLabel: string;
  stepLabelAr: string;
  detectedPose: PoseType;
  time: number;
  ts: number;
}

export interface GroupedMistake extends Mistake {
  count: number;
}

export interface ReportData {
  rakas: number;
  mistakes: number;
  accuracy: number;
  duration: string;
  prayerName: string;
  mistakeDetails: Record<string, GroupedMistake>;
  videoBlob: Blob | null;
}

export type AppScreen = 'setup' | 'loading' | 'session' | 'report';
export type PoseBadgeState = 'correct' | 'wrong' | 'waiting';
