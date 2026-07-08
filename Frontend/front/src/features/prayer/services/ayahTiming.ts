/**
 * Data plumbing for the "ayah being recited now" panel.
 *
 * Three public sources, each fetched once and cached:
 *   1. the read-id map — which mp3quran "read" a reciter's audio folder belongs
 *      to, so timing lines up with the exact recording the app plays;
 *   2. per-surah ayah timing — the start/end offset (ms) of every ayah in a
 *      recording, used to pick the current ayah from the playback clock;
 *   3. per-surah Uthmani text — the words to actually show on screen.
 *
 * mp3quran and alquran.cloud both send permissive CORS headers, so these are
 * fetched straight from the browser (no backend proxy needed).
 */

export interface AyahTiming {
  /** Ayah number within the surah; 0 marks the pre-ayah basmala/intro. */
  ayah: number;
  /** Start offset into the surah's audio, in milliseconds. */
  start: number;
  /** End offset into the surah's audio, in milliseconds. */
  end: number;
}

const READS_URL = 'https://www.mp3quran.net/api/v3/ayat_timing/reads';
const timingUrl = (surah: number, read: number) =>
  `https://www.mp3quran.net/api/v3/ayat_timing?surah=${surah}&read=${read}`;
const textUrl = (surah: number) =>
  `https://api.alquran.cloud/v1/surah/${surah}/quran-uthmani`;

/** The basmala shown for the ayah-0 intro of surahs that open with it. */
export const BASMALA = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

/** Drop the stray BOM/zero-width marks alquran.cloud prefixes onto some ayahs. */
function clean(text: string): string {
  return text.replace(/[\uFEFF\u200B-\u200F]/g, '').trim();
}

function stripSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

// ─── 1) read-id map (reciter audio folder → timing "read" id) ─────────────────

let readsMapPromise: Promise<Map<string, number>> | null = null;

function loadReadsMap(): Promise<Map<string, number>> {
  if (!readsMapPromise) {
    readsMapPromise = fetch(READS_URL)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: Array<{ id: number; folder_url?: string }>) => {
        const map = new Map<string, number>();
        for (const r of list) {
          if (r.folder_url) map.set(stripSlash(r.folder_url), r.id);
        }
        return map;
      })
      .catch(() => new Map<string, number>());
  }
  return readsMapPromise;
}

/**
 * The timing "read" id for a reciter's audio folder, or null when that reciter
 * has no ayah timing published (the panel then simply shows nothing).
 */
export async function getReadId(reciterServer: string | null): Promise<number | null> {
  if (!reciterServer) return null;
  const map = await loadReadsMap();
  return map.get(stripSlash(reciterServer)) ?? null;
}

// ─── 2) per-surah ayah timing ─────────────────────────────────────────────────

const timingCache = new Map<string, Promise<AyahTiming[]>>();

export function getAyahTiming(surah: number, read: number): Promise<AyahTiming[]> {
  const key = `${read}:${surah}`;
  let p = timingCache.get(key);
  if (!p) {
    p = fetch(timingUrl(surah, read))
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Array<{ ayah: number; start_time: number; end_time: number }>) =>
        Array.isArray(rows)
          ? rows.map((x) => ({ ayah: x.ayah, start: x.start_time, end: x.end_time }))
          : [],
      )
      .catch(() => [] as AyahTiming[]);
    timingCache.set(key, p);
  }
  return p;
}

// ─── 3) per-surah Uthmani text (ayah number → text) ───────────────────────────

const textCache = new Map<number, Promise<Map<number, string>>>();

export function getSurahText(surah: number): Promise<Map<number, string>> {
  let p = textCache.get(surah);
  if (!p) {
    p = fetch(textUrl(surah))
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { data?: { ayahs?: Array<{ numberInSurah: number; text: string }> } } | null) => {
        const map = new Map<number, string>();
        for (const a of d?.data?.ayahs ?? []) map.set(a.numberInSurah, clean(a.text));
        return map;
      })
      .catch(() => new Map<number, string>());
    textCache.set(surah, p);
  }
  return p;
}
