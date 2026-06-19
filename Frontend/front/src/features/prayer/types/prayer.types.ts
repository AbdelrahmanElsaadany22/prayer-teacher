export type PoseType =
  | 'unknown'
  | 'qiyam'
  | 'takbeer'
  | 'ruku'
  | 'sujood'
  | 'iqama'
  | 'juloos'
  | 'tashahhud';

export interface Prayer {
  id: string;
  ar: string;
  en: string;
  rakas: number;
}

export interface PoseStep {
  pose: PoseType;
  label: string;
  labelAr: string;
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
