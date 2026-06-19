import type { Mistake, GroupedMistake, ReportData, Prayer, PoseStep } from '../types/prayer.types';
import { formatTime } from './utils';

export function groupMistakes(mistakes: Mistake[]): Record<string, GroupedMistake> {
  const grouped: Record<string, GroupedMistake> = {};
  mistakes.forEach((m) => {
    const key = `R${m.rakaIndex}:${m.stepLabel}`;
    if (!grouped[key]) grouped[key] = { ...m, count: 0 };
    grouped[key].count++;
  });
  return grouped;
}

export function buildReportData(
  prayer: Prayer,
  rakaSequences: PoseStep[][],
  completedRakas: number,
  mistakes: Mistake[],
  sessionStartTime: number,
  videoBlob: Blob | null,
): ReportData {
  const totalSteps = rakaSequences.reduce((sum, seq) => sum + seq.length, 0);
  const mistakeCount = mistakes.length;
  const accuracy =
    totalSteps > 0
      ? Math.max(0, Math.round((1 - mistakeCount / Math.max(totalSteps, 1)) * 100))
      : 100;

  return {
    rakas: completedRakas,
    mistakes: mistakeCount,
    accuracy,
    duration: formatTime(Date.now() - sessionStartTime),
    prayerName: prayer.en,
    mistakeDetails: groupMistakes(mistakes),
    videoBlob,
  };
}
