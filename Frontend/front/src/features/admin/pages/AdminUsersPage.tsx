import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../../../shared/api/axios';
import { avatarUrl } from '../../../shared/utils/avatar';
import { getAdminUsers } from '../api/admin.api';
import type { AdminUserRow } from '../types/admin.types';
import css from './AdminUsersPage.module.css';

const PAGE_SIZE = 10;

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
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminUsers(p, PAGE_SIZE);
      setRows(res.data);
      setTotalPages(res.totalPages);
      setTotal(res.total);
      setPage(res.page);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  return (
    <div className={css.page}>
      <header className={css.header}>
        <span className={css.eyebrow}>Admin</span>
        <h1 className={css.title}>Users</h1>
        <p className={css.subtitle}>
          {total} registered {total === 1 ? 'account' : 'accounts'}
        </p>
      </header>

      {error && <div className={css.error}>{error}</div>}

      {loading ? (
        <div className={css.empty}>Loading…</div>
      ) : rows.length === 0 ? (
        <div className={css.empty}>No users yet.</div>
      ) : (
        <>
          <ul className={css.list}>
            {rows.map((u) => (
              <li key={u._id}>
                <Link to={`/admin/users/${u._id}`} className={css.row}>
                  <Avatar name={u.name} pic={u.profilePicture} />

                  <div className={css.identity}>
                    <span className={css.name}>
                      {u.name}
                      {u.role === 'admin' && (
                        <span className={css.badge}>admin</span>
                      )}
                    </span>
                    <span className={css.email}>{u.email}</span>
                  </div>

                  <div className={css.metric}>
                    <span className={`${css.accuracy} ${accuracyTone(u.accuracy)}`}>
                      {u.accuracy}%
                    </span>
                    <span className={css.metricLabel}>
                      {u.totalPrayers} {u.totalPrayers === 1 ? 'prayer' : 'prayers'}
                    </span>
                  </div>

                  <span className={css.chevron} aria-hidden="true">›</span>
                </Link>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <nav className={css.pager} aria-label="Pagination">
              <button
                type="button"
                onClick={() => void load(page - 1)}
                disabled={page <= 1}
              >
                Previous
              </button>
              <span className={css.pageInfo}>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => void load(page + 1)}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
