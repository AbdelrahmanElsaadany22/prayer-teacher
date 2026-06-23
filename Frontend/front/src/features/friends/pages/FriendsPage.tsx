import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import { getApiErrorMessage } from '../../../shared/api/axios';
import { searchUsersByName, sendFriendRequest } from '../api/friends.api';
import type { FriendProfile } from '../types/friends.types';
import { useFriends } from '../hooks/useFriends';
import { useNotifications } from '../../notifications/context/NotificationsContext';
import css from './FriendsPage.module.css';

export default function FriendsPage() {
  const { user } = useAuth();
  const { friends, loading, error, refresh } = useFriends();
  // Pending requests + their actions live in the shared notifications context,
  // so this page and the navbar bell always stay in sync.
  const { requests, accept, reject, eventTick } = useNotifications();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FriendProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentTo, setSentTo] = useState<Record<string, 'ok' | 'err'>>({});
  const [sendMsg, setSendMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Debounced search by name
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
        setResults(await searchUsersByName(term));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  // Re-sync the friends list whenever a notification event fires (a request was
  // accepted/declined, or a new one arrived) — keeps the page live without a reload.
  useEffect(() => {
    if (eventTick > 0) void refresh();
  }, [eventTick, refresh]);

  async function handleSend(userId: string) {
    setSendMsg(null);
    try {
      await sendFriendRequest(userId);
      setSentTo((prev) => ({ ...prev, [userId]: 'ok' }));
      setSendMsg({ type: 'ok', text: 'Friend request sent!' });
    } catch (err) {
      setSentTo((prev) => ({ ...prev, [userId]: 'err' }));
      setSendMsg({ type: 'err', text: getApiErrorMessage(err) });
    }
  }

  const friendIds = new Set(friends.map((f) => f._id));

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
        <div className={css.empty}>You have no friends yet — send a request below!</div>
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

      {/* ── Add friend ── */}
      <p className={css.sectionTitle}>Add Friend</p>

      <div className={css.addCard}>
        <p className={css.addHint}>
          Search for people by name and send them a friend request.
        </p>
        <div className={css.addForm}>
          <input
            className={css.addInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name…"
            autoComplete="off"
          />
        </div>

        {/* Search results */}
        <div className={css.searchResults}>
          {searching && <p className={css.addHint}>Searching…</p>}

          {!searching && query.trim() && results.length === 0 && (
            <p className={css.addHint}>No users found.</p>
          )}

          {results.map((u) => {
            const isMe = u._id === user?.id;
            const isFriend = friendIds.has(u._id);
            const wasSent = sentTo[u._id] === 'ok';
            return (
              <div key={u._id} className={css.row}>
                <div className={css.avatar}>{u.name?.[0]?.toUpperCase() ?? '?'}</div>
                <div className={css.info}>
                  <span className={css.name}>{u.name}</span>
                  <span className={css.sub}>{u.email}</span>
                </div>
                {isMe ? (
                  <span className={css.sub}>You</span>
                ) : isFriend ? (
                  <span className={css.sub}>Already friends</span>
                ) : (
                  <button
                    type="button"
                    className={css.acceptBtn}
                    disabled={wasSent}
                    onClick={() => handleSend(u._id)}
                  >
                    {wasSent ? 'Sent ✓' : 'Add'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {sendMsg && (
          <p className={sendMsg.type === 'ok' ? css.successMsg : css.errorMsg}>
            {sendMsg.text}
          </p>
        )}
      </div>
    </div>
  );
}
