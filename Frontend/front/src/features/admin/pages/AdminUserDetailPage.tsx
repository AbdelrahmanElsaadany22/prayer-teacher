import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getApiErrorMessage } from '../../../shared/api/axios';
import { useI18n } from '../../../shared/i18n/LanguageProvider';
import { localizePrayerName } from '../../../shared/i18n/translations';
import { avatarUrl } from '../../../shared/utils/avatar';
import { deleteAdminUser, getAdminUserDashboard, setFatihaIjazah } from '../api/admin.api';
import type { AdminUserDashboard } from '../types/admin.types';
import BackLink from '../../../shared/components/BackLink';
import css from './AdminUserDetailPage.module.css';

export default function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t, lang } = useI18n();

  const [data, setData] = useState<AdminUserDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [savingIjazah, setSavingIjazah] = useState(false);
  const [ijazahError, setIjazahError] = useState<string | null>(null);

  // Dates follow the active language, not the browser's locale, so the page
  // doesn't end up half Arabic and half English.
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

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

  async function handleIjazahToggle(granted: boolean) {
    if (!userId) return;
    setSavingIjazah(true);
    setIjazahError(null);
    try {
      const res = await setFatihaIjazah(userId, granted);
      // Patch just this field rather than refetching the whole dashboard —
      // nothing else on the page changed.
      setData((prev) =>
        prev
          ? {
              ...prev,
              user: {
                ...prev.user,
                fatihaIjazah: res.fatihaIjazah,
                fatihaIjazahAt: res.fatihaIjazahAt,
              },
            }
          : prev,
      );
    } catch (err) {
      setIjazahError(getApiErrorMessage(err));
    } finally {
      setSavingIjazah(false);
    }
  }

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

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  if (loading) {
    return <div className={css.page} dir={dir}><p className={css.muted}>{t('admin.loading')}</p></div>;
  }
  if (error) {
    return <div className={css.page} dir={dir}><div className={css.error}>{error}</div></div>;
  }
  if (!data) return null;

  const { user, stats, perPrayer, sessions } = data;
  const src = avatarUrl(user.profilePicture);

  return (
    <div className={css.page} dir={dir}>
      <BackLink to="/admin/users" label={t('admin.backToUsers')} className={css.back} />

      <header className={css.header}>
        <div className={css.avatar}>
          {src ? <img src={src} alt={user.name} /> : (user.name?.[0]?.toUpperCase() ?? '?')}
        </div>
        <div className={css.identity}>
          <h1 className={css.title}>
            {user.name}
            {user.role === 'admin' && <span className={css.badge}>{t('admin.badge')}</span>}
          </h1>
          <p className={css.email}>{user.email}</p>
          <p className={css.meta}>
            {t('admin.joined', { date: formatDate(user.createdAt) })}
            {' · '}
            {user.friendsCount === 1
              ? t('admin.friendsCountOne')
              : t('admin.friendsCount', { n: user.friendsCount })}
            {' · '}
            {user.isVerified ? t('admin.verified') : t('admin.unverified')}
          </p>
        </div>
      </header>

      <section className={css.tiles}>
        <div className={css.tile}>
          <span className={css.tileValue}>{stats.totalPrayers}</span>
          <span className={css.tileLabel}>{t('admin.tilePrayers')}</span>
        </div>
        <div className={css.tile}>
          <span className={css.tileValue}>{stats.avgAccuracy}%</span>
          <span className={css.tileLabel}>{t('admin.tileAccuracy')}</span>
        </div>
        <div className={css.tile}>
          <span className={css.tileValue}>{stats.totalMistakes}</span>
          <span className={css.tileLabel}>{t('admin.tileMistakes')}</span>
        </div>
      </section>

      {/* Only learners are certified; an admin grants the ijazah, never holds it. */}
      {user.role !== 'admin' && (
        <section className={css.ijazahCard}>
          <div className={css.ijazahInfo}>
            <h2 className={css.ijazahTitle}>{t('ijazah.title')}</h2>
            <p className={css.ijazahStatus}>
              {user.fatihaIjazah
                ? t('ijazah.grantedOn', {
                    date: user.fatihaIjazahAt ? formatDate(user.fatihaIjazahAt) : '—',
                  })
                : t('ijazah.notGranted')}
            </p>
          </div>

          <label className={css.switchLabel}>
            <input
              type="checkbox"
              className={css.switchInput}
              checked={user.fatihaIjazah}
              disabled={savingIjazah}
              onChange={(e) => void handleIjazahToggle(e.target.checked)}
            />
            <span className={css.switchTrack} aria-hidden="true">
              <span className={css.switchThumb} />
            </span>
            <span className={css.switchText}>
              {savingIjazah
                ? t('ijazah.saving')
                : user.fatihaIjazah
                  ? t('ijazah.certified')
                  : t('ijazah.markCertified')}
            </span>
          </label>
        </section>
      )}

      {ijazahError && <div className={css.error}>{ijazahError}</div>}

      <section className={css.section}>
        <h2 className={css.sectionTitle}>{t('admin.byPrayer')}</h2>
        {perPrayer.length === 0 ? (
          <p className={css.muted}>{t('admin.noPrayers')}</p>
        ) : (
          <div className={css.tableWrap}>
            <table className={css.table}>
              <thead>
                <tr>
                  <th>{t('admin.colPrayer')}</th>
                  <th>{t('admin.colCount')}</th>
                  <th>{t('admin.colAvgAccuracy')}</th>
                  <th>{t('admin.colMistakes')}</th>
                </tr>
              </thead>
              <tbody>
                {perPrayer.map((p) => (
                  <tr key={p.prayerName}>
                    <td>{localizePrayerName(p.prayerName, lang)}</td>
                    <td>{p.count}</td>
                    <td>{p.avgAccuracy}%</td>
                    <td>{p.totalMistakes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={css.section}>
        <h2 className={css.sectionTitle}>
          {t('admin.sessionsTitle', { n: sessions.length })}
        </h2>
        {sessions.length === 0 ? (
          <p className={css.muted}>{t('admin.noSessions')}</p>
        ) : (
          <div className={css.tableWrap}>
            <table className={css.table}>
              <thead>
                <tr>
                  <th>{t('admin.colDate')}</th>
                  <th>{t('admin.colPrayer')}</th>
                  <th>{t('admin.colRakas')}</th>
                  <th>{t('admin.colAvgAccuracy')}</th>
                  <th>{t('admin.colDuration')}</th>
                  <th>{t('admin.colMistakes')}</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s._id}>
                    <td>{formatDate(s.createdAt)}</td>
                    <td>{localizePrayerName(s.prayerName, lang)}</td>
                    <td>{s.rakas}</td>
                    <td>{s.accuracy}%</td>
                    {/* Durations stay LTR so "04:31" doesn't render reversed. */}
                    <td dir="ltr">{s.duration}</td>
                    <td>{s.mistakes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={css.danger}>
        <h2 className={css.dangerTitle}>{t('admin.deleteTitle')}</h2>
        <p className={css.dangerText}>
          {t('admin.deleteWarning', { name: user.name })}
        </p>

        {deleteError && <div className={css.error}>{deleteError}</div>}

        {!confirming ? (
          <button
            type="button"
            className={css.deleteBtn}
            onClick={() => setConfirming(true)}
            disabled={user.role === 'admin'}
          >
            {user.role === 'admin'
              ? t('admin.deleteAdminBlocked')
              : t('admin.deleteBtn')}
          </button>
        ) : (
          <div className={css.confirmRow}>
            <span className={css.confirmText}>
              {t('admin.deleteConfirm', { name: user.name })}
            </span>
            <button
              type="button"
              className={css.deleteBtn}
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              {deleting ? t('admin.deleting') : t('admin.deleteYes')}
            </button>
            <button
              type="button"
              className={css.cancelBtn}
              onClick={() => setConfirming(false)}
              disabled={deleting}
            >
              {t('admin.cancel')}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
