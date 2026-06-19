import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../shared/api/axios';

export interface PrayerSession {
  _id: string;
  prayerName: string;
  rakas: number;
  accuracy: number;
  duration: string;
  mistakes: number;
  mistakeDetails: Record<string, { stepLabel: string; count: number }>;
  createdAt: string;
}

/** Shape returned by the paginated `GET /prayer` endpoint. */
interface PaginatedSessions {
  data: PrayerSession[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Sessions shown per page in the "Recent Sessions" list. */
export const SESSIONS_PAGE_SIZE = 5;
/** Upper bound of sessions pulled to compute dashboard stats. */
const STATS_FETCH_LIMIT = 100;

export interface PrayerStats {
  prayerName: string;
  count: number;
  avgAccuracy: number;
}

export interface DashboardStats {
  totalSessions: number;
  avgAccuracy: number;
  totalMistakes: number;
  avgDurationMin: number;
  mostMistakenPrayer: string | null;
  mostMistakenMove: string | null;
  perPrayer: PrayerStats[];
  accuracyOverTime: { label: string; accuracy: number }[];
}

function parseDurationToSeconds(duration: string): number {
  const parts = duration.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

const PRAYER_ORDER = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export function computeStats(sessions: PrayerSession[]): DashboardStats {
  if (sessions.length === 0) {
    return {
      totalSessions: 0, avgAccuracy: 0, totalMistakes: 0,
      avgDurationMin: 0, mostMistakenPrayer: null, mostMistakenMove: null,
      perPrayer: [], accuracyOverTime: [],
    };
  }

  const totalSessions = sessions.length;
  const avgAccuracy = Math.round(sessions.reduce((s, r) => s + r.accuracy, 0) / totalSessions);
  const totalMistakes = sessions.reduce((s, r) => s + r.mistakes, 0);

  const totalSeconds = sessions.reduce((s, r) => s + parseDurationToSeconds(r.duration), 0);
  const avgDurationMin = Math.round(totalSeconds / totalSessions / 60 * 10) / 10;

  // Most mistaken prayer
  const mistakesByPrayer: Record<string, number> = {};
  sessions.forEach((s) => {
    mistakesByPrayer[s.prayerName] = (mistakesByPrayer[s.prayerName] ?? 0) + s.mistakes;
  });
  const mostMistakenPrayer = Object.entries(mistakesByPrayer)
    .sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

  // Most mistaken move (across all mistakeDetails)
  const moveCount: Record<string, number> = {};
  sessions.forEach((s) => {
    Object.values(s.mistakeDetails ?? {}).forEach((m) => {
      if (!m?.stepLabel) return;
      moveCount[m.stepLabel] = (moveCount[m.stepLabel] ?? 0) + (m.count ?? 1);
    });
  });
  const mostMistakenMove = Object.entries(moveCount)
    .sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

  // Per-prayer stats (only the 5 fard prayers, in order)
  const prayerMap: Record<string, { total: number; count: number }> = {};
  sessions.forEach((s) => {
    if (!prayerMap[s.prayerName]) prayerMap[s.prayerName] = { total: 0, count: 0 };
    prayerMap[s.prayerName].total += s.accuracy;
    prayerMap[s.prayerName].count += 1;
  });
  const perPrayer: PrayerStats[] = PRAYER_ORDER
    .filter((p) => prayerMap[p])
    .map((p) => ({
      prayerName: p,
      count: prayerMap[p].count,
      avgAccuracy: Math.round(prayerMap[p].total / prayerMap[p].count),
    }));

  // Accuracy over time (chronological — oldest first)
  const accuracyOverTime = [...sessions]
    .reverse()
    .map((s, i) => ({
      label: `#${i + 1}`,
      accuracy: s.accuracy,
    }));

  return {
    totalSessions, avgAccuracy, totalMistakes, avgDurationMin,
    mostMistakenPrayer, mostMistakenMove, perPrayer, accuracyOverTime,
  };
}

interface UseUserSessionsResult {
  /** The current page of sessions for the "Recent Sessions" list. */
  sessions: PrayerSession[];
  /** Stats computed across all of the user's sessions. */
  stats: DashboardStats;
  /** Total number of sessions the user has. */
  total: number;
  page: number;
  totalPages: number;
  goToPage: (page: number) => void;
  loading: boolean;
  error: string | null;
}

export function useUserSessions(): UseUserSessionsResult {
  // Current page of sessions for the list (server-paginated).
  const [sessions, setSessions] = useState<PrayerSession[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // All sessions (capped) used only to compute the dashboard stats.
  const [statsSessions, setStatsSessions] = useState<PrayerSession[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Stats: pulled once across all sessions.
  useEffect(() => {
    api
      .get<PaginatedSessions>('/prayer', {
        params: { page: 1, limit: STATS_FETCH_LIMIT },
      })
      .then((res) => {
        setStatsSessions(res.data.data);
        setTotal(res.data.total);
      })
      .catch(() => setError('Failed to load sessions'));
  }, []);

  // List: re-fetched whenever the page changes.
  useEffect(() => {
    setLoading(true);
    api
      .get<PaginatedSessions>('/prayer', {
        params: { page, limit: SESSIONS_PAGE_SIZE },
      })
      .then((res) => {
        setSessions(res.data.data);
        setTotalPages(res.data.totalPages);
        setTotal(res.data.total);
      })
      .catch(() => setError('Failed to load sessions'))
      .finally(() => setLoading(false));
  }, [page]);

  const goToPage = useCallback(
    (next: number) => setPage((cur) => (next >= 1 ? next : cur)),
    [],
  );

  return {
    sessions,
    stats: computeStats(statsSessions),
    total,
    page,
    totalPages,
    goToPage,
    loading,
    error,
  };
}
