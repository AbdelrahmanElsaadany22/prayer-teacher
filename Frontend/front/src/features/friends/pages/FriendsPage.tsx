import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useFriends } from '../hooks/useFriends';
import { useNotifications } from '../../notifications/context/NotificationsContext';
import { useI18n } from '../../../shared/i18n/LanguageProvider';
import css from './FriendsPage.module.css';

export default function FriendsPage() {
  const { friends, loading, error, refresh } = useFriends();
  const { requests, accept, reject, eventTick } = useNotifications();
  const { t } = useI18n();

  useEffect(() => {
    if (eventTick > 0) void refresh();
  }, [eventTick, refresh]);

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
            <div className={css.avatar}>{req.sender?.name?.[0]?.toUpperCase() ?? '?'}</div>
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
            <div className={css.avatar}>{friend.name?.[0]?.toUpperCase() ?? '?'}</div>
            <div className={css.info}>
              <span className={css.name}>{friend.name}</span>
              <span className={css.sub}>{friend.email}</span>
            </div>
            <Link to={`/chat/${friend._id}`} className={css.chatBtn}>
              {t('friends.chat')}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
