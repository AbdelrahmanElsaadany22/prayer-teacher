import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../../../shared/api/axios';
import { useI18n } from '../../../shared/i18n/LanguageProvider';
import { avatarUrl } from '../../../shared/utils/avatar';
import { getAdminUsers } from '../api/admin.api';
import type { AdminUserRow } from '../types/admin.types';
import css from './AdminUsersPage.module.css';

const PAGE_SIZE = 10;
/** Wait for typing to settle before querying, so one word isn't several requests. */
const SEARCH_DEBOUNCE_MS = 300;

function SearchIcon() {
  return (
    <svg className={css.searchIcon} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Avatar({ name, pic }: { name: string; pic?: string | null }) {
  const src = avatarUrl(pic);
  if (src) {
    return (
      <div className={css.avatar}>
        <img src={src} alt={name} />
      </div>
    );
  }
  return <div className={css.avatar}>{name?.[0]?.toUpperCase() ?? '?'}</div>;
}

/** Green above 85, amber above 60, red below — so the list scans at a glance. */
function accuracyTone(accuracy: number): string {
  if (accuracy >= 85) return css.good;
  if (accuracy >= 60) return css.mid;
  return css.low;
}

export default function AdminUsersPage() {
  const { t, lang } = useI18n();

  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  /** The term the current results belong to; lags `query` by the debounce. */
  const [activeTerm, setActiveTerm] = useState('');

  const load = useCallback(async (p: number, term: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminUsers(p, PAGE_SIZE, term);
      setRows(res.data);
      setTotalPages(res.totalPages);
      setTotal(res.total);
      setPage(res.page);
      setActiveTerm(term);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-query on a settled search term, always from page one — page 4 of the old
  // results is meaningless against a new filter.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      void load(1, '');
      return;
    }
    const handle = setTimeout(() => void load(1, query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query, load]);

  const countLabel =
    total === 1
      ? t('admin.accountsCountOne')
      : t('admin.accountsCount', { n: total });

  return (
    <div className={css.page} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <header className={css.header}>
        <span className={css.eyebrow}>{t('admin.eyebrow')}</span>
        <h1 className={css.title}>{t('admin.usersTitle')}</h1>
        <p className={css.subtitle}>{countLabel}</p>
      </header>

      <div className={css.searchBar}>
        <SearchIcon />
        <input
          className={css.searchInput}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('admin.searchPlaceholder')}
          aria-label={t('admin.searchPlaceholder')}
        />
        {query && (
          <button
            type="button"
            className={css.searchClear}
            onClick={() => setQuery('')}
            aria-label={t('admin.searchClear')}
          >
            ×
          </button>
        )}
      </div>

      {error && <div className={css.error}>{error}</div>}

      {loading ? (
        <div className={css.empty}>{t('admin.loading')}</div>
      ) : rows.length === 0 ? (
        <div className={css.empty}>
          {activeTerm
            ? t('admin.noMatches', { q: activeTerm })
            : t('admin.noUsers')}
        </div>
      ) : (
        <>
          <ul className={css.list}>
            {rows.map((u) => (
              <li key={u._id}>
                {/* Straight to the admin view of this user, never the public
                    profile — an admin has no reason to be offered "add friend". */}
                <Link to={`/admin/users/${u._id}`} className={css.row}>
                  <Avatar name={u.name} pic={u.profilePicture} />

                  <div className={css.identity}>
                    <span className={css.name}>
                      {u.name}
                      {u.role === 'admin' && (
                        <span className={css.badge}>{t('admin.badge')}</span>
                      )}
                    </span>
                    <span className={css.email}>{u.email}</span>
                  </div>

                  <div className={css.metric}>
                    <span className={`${css.accuracy} ${accuracyTone(u.accuracy)}`}>
                      {u.accuracy}%
                    </span>
                    <span className={css.metricLabel}>
                      {u.totalPrayers === 1
                        ? t('admin.prayersUnitOne')
                        : t('admin.prayersUnit', { n: u.totalPrayers })}
                    </span>
                  </div>

                  <span className={css.chevron} aria-hidden="true">
                    {lang === 'ar' ? '‹' : '›'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <nav className={css.pager} aria-label="Pagination">
              <button
                type="button"
                onClick={() => void load(page - 1, activeTerm)}
                disabled={page <= 1}
              >
                {t('admin.prev')}
              </button>
              <span className={css.pageInfo}>
                {t('admin.pageInfo', { page, total: totalPages })}
              </span>
              <button
                type="button"
                onClick={() => void load(page + 1, activeTerm)}
                disabled={page >= totalPages}
              >
                {t('admin.next')}
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
