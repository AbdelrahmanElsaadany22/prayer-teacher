import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getApiErrorMessage } from '../../../shared/api/axios';
import { avatarUrl } from '../../../shared/utils/avatar';
import { deleteAdminUser, getAdminUserDashboard } from '../api/admin.api';
import type { AdminUserDashboard } from '../types/admin.types';
import css from './AdminUserDetailPage.module.css';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<AdminUserDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true);
    getAdminUserDashboard(userId)
      .then((d) => { if (active) setData(d); })
      .catch((err) => { if (active) setError(getApiErrorMessage(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId]);

  async function handleDelete() {
    if (!userId) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAdminUser(userId);
      navigate('/admin/users', { replace: true });
    } catch (err) {
      setDeleteError(getApiErrorMessage(err));
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (loading) return <div className={css.page}><p className={css.muted}>Loading…</p></div>;
  if (error) return <div className={css.page}><div className={css.error}>{error}</div></div>;
  if (!data) return null;

  const { user, stats, perPrayer, sessions } = data;
  const src = avatarUrl(user.profilePicture);

  return (
    <div className={css.page}>
      <Link to="/admin/users" className={css.back}>← All users</Link>

      <header className={css.header}>
        <div className={css.avatar}>
          {src ? <img src={src} alt={user.name} /> : (user.name?.[0]?.toUpperCase() ?? '?')}
        </div>
        <div className={css.identity}>
          <h1 className={css.title}>
            {user.name}
            {user.role === 'admin' && <span className={css.badge}>admin</span>}
          </h1>
          <p className={css.email}>{user.email}</p>
          <p className={css.meta}>
            Joined {formatDate(user.createdAt)} · {user.friendsCount}{' '}
            {user.friendsCount === 1 ? 'friend' : 'friends'} ·{' '}
            {user.isVerified ? 'verified' : 'unverified'}
          </p>
        </div>
      </header>

      <section className={css.tiles}>
        <div className={css.tile}>
          <span className={css.tileValue}>{stats.totalPrayers}</span>
          <span className={css.tileLabel}>Prayers</span>
        </div>
        <div className={css.tile}>
          <span className={css.tileValue}>{stats.avgAccuracy}%</span>
          <span className={css.tileLabel}>Avg accuracy</span>
        </div>
        <div className={css.tile}>
          <span className={css.tileValue}>{stats.totalMistakes}</span>
          <span className={css.tileLabel}>Total mistakes</span>
        </div>
      </section>

      <section className={css.section}>
        <h2 className={css.sectionTitle}>By prayer</h2>
        {perPrayer.length === 0 ? (
          <p className={css.muted}>No prayers recorded.</p>
        ) : (
          <table className={css.table}>
            <thead>
              <tr>
                <th>Prayer</th><th>Count</th><th>Avg accuracy</th><th>Mistakes</th>
              </tr>
            </thead>
            <tbody>
              {perPrayer.map((p) => (
                <tr key={p.prayerName}>
                  <td>{p.prayerName}</td>
                  <td>{p.count}</td>
                  <td>{p.avgAccuracy}%</td>
                  <td>{p.totalMistakes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={css.section}>
        <h2 className={css.sectionTitle}>Sessions ({sessions.length})</h2>
        {sessions.length === 0 ? (
          <p className={css.muted}>No sessions recorded.</p>
        ) : (
          <div className={css.tableWrap}>
            <table className={css.table}>
              <thead>
                <tr>
                  <th>Date</th><th>Prayer</th><th>Rak'ahs</th>
                  <th>Accuracy</th><th>Duration</th><th>Mistakes</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s._id}>
                    <td>{formatDate(s.createdAt)}</td>
                    <td>{s.prayerName}</td>
                    <td>{s.rakas}</td>
                    <td>{s.accuracy}%</td>
                    <td>{s.duration}</td>
                    <td>{s.mistakes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={css.danger}>
        <h2 className={css.dangerTitle}>Delete this user</h2>
        <p className={css.dangerText}>
          Permanently removes {user.name}, along with their {sessions.length}{' '}
          {sessions.length === 1 ? 'session' : 'sessions'}, their messages, and
          their friend connections. This cannot be undone.
        </p>

        {deleteError && <div className={css.error}>{deleteError}</div>}

        {!confirming ? (
          <button
            type="button"
            className={css.deleteBtn}
            onClick={() => setConfirming(true)}
            disabled={user.role === 'admin'}
          >
            {user.role === 'admin' ? 'Admin accounts cannot be deleted' : 'Delete user'}
          </button>
        ) : (
          <div className={css.confirmRow}>
            <span className={css.confirmText}>Delete {user.name}?</span>
            <button
              type="button"
              className={css.deleteBtn}
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button
              type="button"
              className={css.cancelBtn}
              onClick={() => setConfirming(false)}
              disabled={deleting}
            >
              Cancel
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
