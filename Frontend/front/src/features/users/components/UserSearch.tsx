import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../../shared/i18n/LanguageProvider';
import { searchUsers } from '../api/users.api';
import type { UserSearchResult } from '../types/users.types';
import css from './UserSearch.module.css';

export default function UserSearch() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        setResults(await searchUsers(term));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function openProfile(userId: string) {
    setOpen(false);
    setQuery('');
    setResults([]);
    navigate(`/users/${userId}`);
  }

  return (
    <div className={css.search} ref={containerRef}>
      <input
        className={css.input}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={t('search.placeholder')}
        autoComplete="off"
        aria-label={t('search.ariaLabel')}
      />

      {open && query.trim() && (
        <div className={css.dropdown}>
          {searching && <p className={css.hint}>{t('search.searching')}</p>}

          {!searching && results.length === 0 && (
            <p className={css.hint}>{t('search.noResults')}</p>
          )}

          {results.map((u) => (
            <button
              key={u._id}
              type="button"
              className={css.result}
              onClick={() => openProfile(u._id)}
            >
              <span className={css.avatar}>{u.name?.[0]?.toUpperCase() ?? '?'}</span>
              <span className={css.info}>
                <span className={css.name}>{u.name}</span>
                <span className={css.email}>{u.email}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
