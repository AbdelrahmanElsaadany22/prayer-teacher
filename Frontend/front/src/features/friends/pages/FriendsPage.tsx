import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../../../shared/api/axios';
import { useI18n } from '../../../shared/i18n/LanguageProvider';
import { getFriendsComparison } from '../../users/api/users.api';
import type { FriendComparison } from '../../users/types/users.types';
import { useNotifications } from '../../notifications/context/NotificationsContext';
import { removeFriend } from '../api/friends.api';
import { useFriends } from '../hooks/useFriends';
import { getUnreadCounts } from '../../chat/api/chat.api';
import { avatarUrl } from '../../../shared/utils/avatar';
import css from './FriendsPage.module.css';

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

export default function FriendsPage() {
  const { friends, loading, error, refresh } = useFriends();
  const { requests, accept, reject, eventTick } = useNotifications();
  const { t } = useI18n();
  const [removing, setRemoving] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<FriendComparison[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (eventTick > 0) void refresh();
  }, [eventTick, refresh]);

  useEffect(() => {
    getUnreadCounts().then(setUnreadCounts).catch(() => {});
  }, [friends, eventTick]);

  useEffect(() => {
    getFriendsComparison()
      .then((data) => setLeaderboard([...data].sort((a, b) => b.avgAccuracy - a.avgAccuracy)))
      .catch(() => {});
  }, [friends]);

  async function handleRemove(friendId: string) {
    setRemoving(friendId);
    try {
      await removeFriend(friendId);
      await refresh();
    } catch (err) {
      alert(getApiErrorMessage(err));
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className={css.page}>
      <div className={css.header}>
        <span className={css.eyebrow}>{t('friends.eyebrow')}</span>
        <h1 className={css.title}>{t('friends.title')}</h1>
      </div>

      {loading && <div className={css.loader}>{t('friends.loading')}</div>}
      {error && <div className={css.errorBanner}>{error}</div>}

      <p className={css.sectionTitle}>
        {t('friends.incomingRequests')}
        {requests.length > 0 && <span className={css.badge}>{requests.length}</span>}
      </p>

      {!loading && requests.length === 0 && (
        <div className={css.empty}>{t('friends.noPendingRequests')}</div>
      )}

      <div className={css.list}>
        {requests.map((req) => (
          <div key={req._id} className={css.row}>
            <Avatar name={req.sender.name} />
            <div className={css.info}>
              <span className={css.name}>{req.sender.name}</span>
              <span className={css.sub}>{req.sender.email}</span>
            </div>
            <div className={css.rowActions}>
              <button type="button" className={css.acceptBtn} onClick={() => accept(req._id)}>
                {t('friends.accept')}
              </button>
              <button type="button" className={css.rejectBtn} onClick={() => reject(req._id)}>
                {t('friends.reject')}
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className={css.sectionTitle}>{t('friends.yourFriends')}</p>

      {!loading && friends.length === 0 && (
        <div className={css.empty}>{t('friends.noFriends')}</div>
      )}

      <div className={css.list}>
        {friends.map((friend) => (
          <div key={friend._id} className={css.row}>
            <Avatar name={friend.name} pic={friend.profilePicture} />
            <div className={css.info}>
              <span className={css.name}>{friend.name}</span>
              <span className={css.sub}>{friend.email}</span>
            </div>
            <div className={css.rowActions}>
              <Link to={`/chat/${friend._id}`} className={css.chatBtn}>
                {t('friends.chat')}
                {(unreadCounts[friend._id] ?? 0) > 0 && (
                  <span className={css.unreadBadge}>{unreadCounts[friend._id]}</span>
                )}
              </Link>
              <button
                type="button"
                className={css.removeBtn}
                onClick={() => handleRemove(friend._id)}
                disabled={removing === friend._id}
              >
                {removing === friend._id ? '…' : t('friends.remove')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {leaderboard.length > 0 && (
        <>
          <p className={css.sectionTitle}>{t('friends.leaderboard')}</p>
          <div className={css.leaderboard}>
            <div className={css.lbHeader}>
              <span>{t('compare.rank')}</span>
              <span>{t('compare.player')}</span>
              <span>{t('compare.prayers')}</span>
              <span>{t('compare.accuracy')}</span>
              <span>{t('compare.mistakes')}</span>
            </div>
            {leaderboard.map((entry, i) => (
              <div key={entry.userId} className={`${css.lbRow}${entry.isSelf ? ` ${css.lbSelf}` : ''}`}>
                <span className={css.lbRank} data-rank={i + 1}>{i + 1}</span>
                <span className={css.lbName}>
                  {entry.name}
                  {entry.isSelf && <span className={css.youBadge}>{t('friends.youLabel')}</span>}
                </span>
                <span>{entry.totalPrayers}</span>
                <span>{entry.avgAccuracy}%</span>
                <span>{entry.avgMistakes}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
