import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import { getUserProfile } from '../../friends/api/friends.api';
import type { FriendProfile } from '../../friends/types/friends.types';
import { useChat } from '../hooks/useChat';
import { avatarUrl } from '../../../shared/utils/avatar';
import css from './ChatPage.module.css';

export default function ChatPage() {
  const { friendId } = useParams<{ friendId: string }>();
  const { user } = useAuth();
  const [friend, setFriend] = useState<FriendProfile | null>(null);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, isOnline, loading, sendMessage } = useChat(friendId!, user!.id);

  useEffect(() => {
    if (!friendId) return;
    getUserProfile(friendId).then(setFriend).catch(() => null);
  }, [friendId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage(text.trim());
    setText('');
  }

  return (
    <div className={css.shell}>
      {/* ── Header ── */}
      <div className={css.header}>
        <Link to="/friends" className={css.back}>
          ← Back
        </Link>
        <div className={css.friendMeta}>
          <div className={css.friendAvatar}>
            {avatarUrl(friend?.profilePicture) ? (
              <img src={avatarUrl(friend?.profilePicture)!} alt={friend?.name} />
            ) : (
              friend?.name?.[0]?.toUpperCase() ?? '?'
            )}
          </div>
          <div className={css.friendInfo}>
            <span className={css.friendName}>{friend?.name ?? '…'}</span>
            <span className={`${css.status} ${isOnline ? css.online : css.offline}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className={css.messages}>
        {loading && <div className={css.stateMsg}>Loading messages…</div>}

        {!loading && messages.length === 0 && (
          <div className={css.stateMsg}>No messages yet — say hello!</div>
        )}

        {messages.map((msg) => {
          const isMine = msg.sender === user!.id;
          return (
            <div key={msg._id} className={`${css.msgRow} ${isMine ? css.mine : css.theirs}`}>
              <div className={css.bubble}>{msg.message}</div>
              <div className={css.meta}>
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {isMine && (
                  <span className={msg.seen ? css.seenTick : css.sentTick}>
                    {msg.seen ? '✓✓' : '✓'}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <form className={css.inputArea} onSubmit={handleSend}>
        <input
          className={css.input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          autoComplete="off"
        />
        <button type="submit" className={css.sendBtn} disabled={!text.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
