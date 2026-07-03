import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../../shared/i18n/LanguageProvider';
import { useReciter } from '../../../shared/reciter/ReciterProvider';
import { getReciters, type Reciter } from '../../prayer/api/reciters.api';
import css from './ReciterPicker.module.css';

const MAX_RESULTS = 30;

/** Folds Arabic letter variants (alef/ta-marbuta/alef-maqsura) so e.g. "ا" also matches "أ"/"إ"/"آ". */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
}

/** Subsequence fuzzy match: every query char must appear in order (not necessarily adjacent).
 *  Returns the matched span's length (smaller = tighter match = better), or null if no match. */
function fuzzyScore(name: string, query: string): number | null {
  let qi = 0;
  let start = -1;
  let end = -1;
  for (let i = 0; i < name.length && qi < query.length; i++) {
    if (name[i] === query[qi]) {
      if (start === -1) start = i;
      end = i;
      qi++;
    }
  }
  return qi === query.length ? end - start : null;
}

export default function ReciterPicker() {
  const { t, lang } = useI18n();
  const { reciter, setReciter } = useReciter();
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    getReciters(lang === 'ar' ? 'ar' : 'en')
      .then(setReciters)
      .catch(() => setReciters([]))
      .finally(() => setLoading(false));
  }, [lang]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Cap only applies while narrowing a search — with no query, show the full
  // (scrollable) list so every reciter is reachable, not just the first
  // alphabetically.
  const term = normalize(query.trim());
  const filtered = term
    ? reciters
        .map((r) => ({ r, score: fuzzyScore(normalize(r.name), term) }))
        .filter((x): x is { r: Reciter; score: number } => x.score !== null)
        .sort((a, b) => a.score - b.score)
        .slice(0, MAX_RESULTS)
        .map((x) => x.r)
    : reciters;

  function choose(r: Reciter | null) {
    setReciter(r);
    setQuery('');
    setOpen(false);
  }

  return (
    <div className={css.picker} ref={containerRef} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className={css.current}>{reciter?.name ?? t('reciter.default')}</div>
      <input
        className={css.input}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={t('reciter.searchPlaceholder')}
        autoComplete="off"
        aria-label={t('reciter.searchPlaceholder')}
      />

      {open && (
        <div className={css.dropdown}>
          {loading && <p className={css.hint}>{t('reciter.loading')}</p>}

          {!loading && (
            <button type="button" className={css.result} onClick={() => choose(null)}>
              <span className={css.name}>{t('reciter.default')}</span>
            </button>
          )}

          {!loading && filtered.length === 0 && (
            <p className={css.hint}>{t('reciter.noResults')}</p>
          )}

          {!loading && filtered.map((r) => (
            <button
              key={r.id}
              type="button"
              className={css.result}
              onClick={() => choose(r)}
            >
              <span className={css.name}>{r.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
