import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useFriends } from '../hooks/useFriends';
import { useNotifications } from '../../notifications/context/NotificationsContext';
import css from './FriendsPage.module.css';

export default function FriendsPage() {
  const { friends, loading, error, refresh } = useFriends();
  // Pending requests + their actions live in the shared notifications context,
  // so this page and the navbar bell always stay in sync.
  const { requests, accept, reject, eventTick } = useNotifications();

  // Re-sync the friends list whenever a notification event fires (a request was
  // accepted/declined, or a new one arrived) — keeps the page live without a reload.
  useEffect(() => {
    if (eventTick > 0) void refresh();
  }, [eventTick, refresh]);

  return (
    <div className={css.page}>
      <div className={css.header}>
        <span className={css.eyebrow}>Social</span>
        <h1 className={css.title}>Friends</h1>
      </div>

      {loading && <div className={css.loader}>Loading...</div>}
      {error && <div className={css.errorBanner}>{error}</div>}

      {/* ── Incoming requests ── */}
      <p className={css.sectionTitle}>
        Incoming Requests
        {requests.length > 0 && <span className={css.badge}>{requests.length}</span>}
      </p>

      {!loading && requests.length === 0 && (
        <div className={css.empty}>No pending requests</div>
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
                Accept
              </button>
              <button type="button" className={css.rejectBtn} onClick={() => reject(req._id)}>
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Friends list ── */}
      <p className={css.sectionTitle}>Your Friends</p>

      {!loading && friends.length === 0 && (
        <div className={css.empty}>
          You have no friends yet — search for people from the bar above!
        </div>
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
              Chat
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
