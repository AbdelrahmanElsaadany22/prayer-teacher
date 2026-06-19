import type { PoseType } from '../types/prayer.types';
import type { Lang } from '../../../shared/i18n/translations';

export const POSE_LABELS: Record<PoseType, string> = {
  unknown: 'Unknown',
  qiyam: 'Qiyam',
  takbeer: 'Takbeer',
  ruku: "Ruku'",
  sujood: 'Sujood',
  iqama: "I'tidal",
  juloos: 'Juloos',
  tashahhud: 'Tashahhud',
};

export const POSE_LABELS_AR: Record<PoseType, string> = {
  unknown: 'غير معروف',
  qiyam: 'القيام',
  takbeer: 'تكبيرة الإحرام',
  ruku: 'الركوع',
  sujood: 'السجود',
  iqama: 'الاعتدال',
  juloos: 'الجلسة',
  tashahhud: 'التشهد',
};

export function getPoseLabel(pose: PoseType, lang: Lang = 'en'): string {
  const map = lang === 'ar' ? POSE_LABELS_AR : POSE_LABELS;
  return map[pose] ?? map.unknown;
}
