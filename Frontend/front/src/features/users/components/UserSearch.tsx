import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchUsers } from '../api/users.api';
import type { UserSearchResult } from '../types/users.types';
import css from './UserSearch.module.css';

/**
 * Navbar search box. Debounces lookups by name and shows a dropdown of matches;
 * clicking a match opens that user's public profile page.
 */
export default function UserSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search by name.
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

  // Close the dropdown when clicking outside the component.
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
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search users…"
        autoComplete="off"
        aria-label="Search users by name"
      />

      {open && query.trim() && (
        <div className={css.dropdown}>
          {searching && <p className={css.hint}>Searching…</p>}

          {!searching && results.length === 0 && (
            <p className={css.hint}>No users found.</p>
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
