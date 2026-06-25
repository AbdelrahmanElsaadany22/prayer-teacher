import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getApiErrorMessage } from '../../../shared/api/axios';
import { useI18n } from '../../../shared/i18n/LanguageProvider';
import { cancelFriendRequest, sendFriendRequest } from '../../friends/api/friends.api';
import { useNotifications } from '../../notifications/context/NotificationsContext';
import { getUserProfileWithStats } from '../api/users.api';
import type { UserProfileWithStats } from '../types/users.types';
import css from './UserProfilePage.module.css';

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { accept, reject, eventTick } = useNotifications();
  const { t } = useI18n();

  const [profile, setProfile] = useState<UserProfileWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    try {
      setProfile(await getUserProfileWithStats(userId));
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true);
    setError(null);
    setActionMsg(null);
    getUserProfileWithStats(userId)
      .then((data) => { if (active) setProfile(data); })
      .catch((err) => { if (active) setError(getApiErrorMessage(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    if (eventTick > 0) void loadProfile();
  }, [eventTick, loadProfile]);

  async function handleSend() {
    if (!userId) return;
    setActionMsg(null);
    try {
      await sendFriendRequest(userId);
      setProfile((p) => (p ? { ...p, relationship: 'outgoing_pending' } : p));
      setActionMsg({ type: 'ok', text: t('profile.requestSentMsg') });
      await loadProfile();
    } catch (err) {
      setActionMsg({ type: 'err', text: getApiErrorMessage(err) });
    }
  }

  async function handleCancel() {
    if (!profile?.requestId) return;
    setActionMsg(null);
    try {
      await cancelFriendRequest(profile.requestId);
      setProfile((p) => (p ? { ...p, relationship: 'none', requestId: null } : p));
      setActionMsg({ type: 'ok', text: t('profile.requestCancelledMsg') });
    } catch (err) {
      setActionMsg({ type: 'err', text: getApiErrorMessage(err) });
    }
  }

  async function handleAccept() {
    if (!profile?.requestId) return;
    await accept(profile.requestId);
    setProfile((p) => (p ? { ...p, relationship: 'friends', requestId: null } : p));
    setActionMsg({ type: 'ok', text: t('profile.nowFriendsMsg') });
  }

  async function handleReject() {
    if (!profile?.requestId) return;
    await reject(profile.requestId);
    setProfile((p) => (p ? { ...p, relationship: 'none', requestId: null } : p));
  }

  function renderAction() {
    if (!profile) return null;
    switch (profile.relationship) {
      case 'self':
        return null;
      case 'friends':
        return <span className={css.statusPill}>{t('profile.alreadyFriends')}</span>;
      case 'outgoing_pending':
        return (
          <div className={css.actionRow}>
            <span className={css.statusPill}>{t('profile.requestSent')}</span>
            <button type="button" className={css.ghostBtn} onClick={handleCancel}>
              {t('profile.cancel')}
            </button>
          </div>
        );
      case 'incoming_pending':
        return (
          <div className={css.actionRow}>
            <button type="button" className={css.primaryBtn} onClick={handleAccept}>
              {t('profile.acceptRequest')}
            </button>
            <button type="button" className={css.ghostBtn} onClick={handleReject}>
              {t('profile.reject')}
            </button>
          </div>
        );
      default:
        return (
          <button type="button" className={css.primaryBtn} onClick={handleSend}>
            {t('profile.addFriend')}
          </button>
        );
    }
  }

  return (
    <div className={css.page}>
      {loading && <div className={css.loader}>{t('profile.loading')}</div>}
      {error && <div className={css.errorBanner}>{error}</div>}

      {!loading && !error && profile && (
        <>
          <div className={css.card}>
            <div className={css.avatar}>{profile.name?.[0]?.toUpperCase() ?? '?'}</div>
            <div className={css.identity}>
              <h1 className={css.name}>{profile.name}</h1>
              <span className={css.email}>{profile.email}</span>
            </div>
            <div className={css.cardAction}>{renderAction()}</div>
          </div>

          {actionMsg && (
            <p className={actionMsg.type === 'ok' ? css.successMsg : css.errorMsg}>
              {actionMsg.text}
            </p>
          )}

          <p className={css.sectionTitle}>{t('profile.prayerStats')}</p>
          <div className={css.statsGrid}>
            <div className={css.statCard}>
              <span className={css.statLabel}>{t('profile.totalPrayers')}</span>
              <span className={css.statValue}>{profile.totalPrayers}</span>
              <span className={css.statSub}>{t('profile.sessionsLogged')}</span>
            </div>
            <div className={css.statCard}>
              <span className={css.statLabel}>{t('profile.accuracy')}</span>
              <span className={css.statValue}>{profile.accuracy}%</span>
              <span className={css.statSub}>{t('profile.avgAcrossSessions')}</span>
            </div>
          </div>

          <Link to="/friends" className={css.backLink}>
            {t('profile.backToFriends')}
          </Link>
        </>
      )}
    </div>
  );
}
