import { useEffect, useRef, useState } from 'react';
import { audioService } from '../services/audioService';
import { getReadId, getAyahTiming, getSurahText, BASMALA, type AyahTiming } from '../services/ayahTiming';
import { useReciter } from '../../../shared/reciter/ReciterProvider';

export interface CurrentAyah {
  surah: number;
  /** Ayah number within the surah (0 = the opening basmala). */
  number: number;
  text: string;
}

/**
 * Tracks the ayah being recited right now, driven by {@link audioService}'s
 * recitation clock. Returns null whenever nothing is being recited, or when the
 * active reciter has no published ayah timing.
 *
 * Timing + text are fetched lazily per surah and cached; the animation-frame
 * loop only reads already-resolved data, so it never awaits mid-frame. It idles
 * (returns null) on its own whenever no recitation is sounding.
 */
export function useRecitationAyah(): CurrentAyah | null {
  const { reciter } = useReciter();
  const [ayah, setAyah] = useState<CurrentAyah | null>(null);

  // The reciter's timing "read" id, resolved once per reciter.
  const readIdRef = useRef<number | null>(null);
  useEffect(() => {
    let alive = true;
    readIdRef.current = null;
    getReadId(reciter?.server ?? null).then((id) => {
      if (alive) readIdRef.current = id;
    });
    return () => {
      alive = false;
    };
  }, [reciter]);

  useEffect(() => {
    let raf = 0;
    const timing = new Map<number, AyahTiming[]>();
    const text = new Map<number, Map<number, string>>();
    const requested = new Set<string>();
    // Last (surah, ayah) pushed to state — avoids re-rendering every frame.
    let shownSurah = -1;
    let shownNumber = -1;

    const clear = () => {
      if (shownSurah !== -1 || shownNumber !== -1) {
        shownSurah = -1;
        shownNumber = -1;
        setAyah(null);
      }
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);

      const clock = audioService.getReciteClock();
      const read = readIdRef.current;
      if (!clock || read == null) {
        clear();
        return;
      }

      const { surah, elapsedMs } = clock;

      // Kick off (once) the lazy loads for this surah.
      const key = `${read}:${surah}`;
      if (!requested.has(key)) {
        requested.add(key);
        getAyahTiming(surah, read).then((t) => timing.set(surah, t));
        getSurahText(surah).then((t) => text.set(surah, t));
      }

      const rows = timing.get(surah);
      if (!rows || rows.length === 0) return; // still loading

      const row = rows.find((r) => elapsedMs >= r.start && elapsedMs < r.end);
      if (!row) {
        clear();
        return;
      }

      if (row.ayah === shownNumber && surah === shownSurah) return;

      const body =
        row.ayah === 0 ? BASMALA : text.get(surah)?.get(row.ayah) ?? '';
      shownSurah = surah;
      shownNumber = row.ayah;
      setAyah({ surah, number: row.ayah, text: body });
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return ayah;
}
