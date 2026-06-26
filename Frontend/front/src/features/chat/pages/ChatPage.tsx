import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import { getUserProfile } from '../../friends/api/friends.api';
import type { FriendProfile } from '../../friends/types/friends.types';
import { useChat } from '../hooks/useChat';
import { useI18n } from '../../../shared/i18n/LanguageProvider';
import { api } from '../../../shared/api/axios';
import { avatarUrl } from '../../../shared/utils/avatar';
import css from './ChatPage.module.css';

export default function ChatPage() {
  const { friendId } = useParams<{ friendId: string }>();
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [friend, setFriend] = useState<FriendProfile | null>(null);
  const [myPic, setMyPic] = useState<string | null>(null);
  const [text, setText] = useState('');
  const msgsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, isOnline, loading, sendMessage } = useChat(friendId!, user!.id);

  useEffect(() => {
    if (!friendId) return;
    getUserProfile(friendId).then(setFriend).catch(() => null);
  }, [friendId]);

  useEffect(() => {
    api.get<{ profilePicture?: string | null }>('/user/current')
      .then(r => setMyPic(avatarUrl(r.data.profilePicture) ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const el = msgsRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = text.trim();
      if (!trimmed) return;
      sendMessage(trimmed);
      setText('');
    }
  }

  const isRtl = lang === 'ar';
  const friendPic = avatarUrl(friend?.profilePicture);
  const myInitial = user?.name?.[0]?.toUpperCase() ?? '?';
  const friendInitial = friend?.name?.[0]?.toUpperCase() ?? '?';

  return (
    <div className={css.shell} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className={css.chatBox}>

        {/* ── Header ── */}
        <div className={css.chatHeader}>
          <Link to="/friends" className={css.back}>
            {isRtl ? '→' : '←'}
          </Link>
          <div className={css.friendAv}>
            {friendPic
              ? <img src={friendPic} alt={friend?.name} />
              : friendInitial}
          </div>
          <div className={css.friendInfo}>
            <span className={css.friendName}>{friend?.name ?? '…'}</span>
            <span className={`${css.status} ${isOnline ? css.online : css.offline}`}>
              {isOnline ? t('chat.online') : t('chat.offline')}
            </span>
          </div>
        </div>

        {/* ── Messages ── */}
        <div className={css.msgs} ref={msgsRef}>
          {loading && (
            <div className={css.stateMsg}>{t('chat.loading')}</div>
          )}
          {!loading && messages.length === 0 && (
            <div className={css.stateMsg}>{t('chat.empty')}</div>
          )}
          {messages.map((msg) => {
            const isMine = msg.sender === user!.id;
            const pic    = isMine ? myPic : friendPic;
            const init   = isMine ? myInitial : friendInitial;
            const name   = isMine ? user?.name : friend?.name;
            return (
              <div
                key={msg._id}
                className={`${css.msgRow} ${isMine ? css.mine : ''}`}
              >
                <div className={css.avatar}>
                  {pic ? <img src={pic} alt={name} /> : init}
                </div>
                <div className={css.msgContent}>
                  <div className={css.msgText}>{msg.message}</div>
                  <div className={css.msgMeta}>
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
              </div>
            );
          })}
        </div>

        {/* ── Input ── */}
        <div className={css.inputRow}>
          <div className={css.myAv}>
            {myPic ? <img src={myPic} alt={user?.name} /> : myInitial}
          </div>
          <input
            ref={inputRef}
            className={css.input}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.placeholder')}
            autoComplete="off"
            dir={isRtl ? 'rtl' : 'ltr'}
          />
        </div>

      </div>
    </div>
  );
}
