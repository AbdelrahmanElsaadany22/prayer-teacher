import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import { getUserProfile } from '../../friends/api/friends.api';
import type { FriendProfile } from '../../friends/types/friends.types';
import { useChat } from '../hooks/useChat';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { sendVoiceMessage } from '../api/chat.api';
import { getApiErrorMessage } from '../../../shared/api/axios';
import { useI18n } from '../../../shared/i18n/LanguageProvider';
import { avatarUrl } from '../../../shared/utils/avatar';
import css from './ChatPage.module.css';

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ChatPage() {
  const { friendId } = useParams<{ friendId: string }>();
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [friend, setFriend] = useState<FriendProfile | null>(null);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const msgsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, isOnline, loading, sendMessage, appendMessage } = useChat(
    friendId!,
    user!.id,
  );
  const recorder = useVoiceRecorder();

  useEffect(() => {
    if (!friendId) return;
    getUserProfile(friendId).then(setFriend).catch(() => null);
  }, [friendId]);

  useEffect(() => {
    const el = msgsRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setText('');
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleStopAndSend() {
    const blob = await recorder.stop();
    if (!blob || !friendId) return;

    setUploading(true);
    setSendError(null);
    try {
      // The server also broadcasts this to the room; useChat drops the
      // duplicate by id, so adding it here just makes it appear immediately.
      appendMessage(await sendVoiceMessage(friendId, blob));
    } catch (err) {
      setSendError(getApiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  function handleCancelRecording() {
    recorder.cancel();
    setSendError(null);
  }

  // Surface a denied-microphone as a message rather than a silent no-op.
  useEffect(() => {
    if (recorder.error === 'mic') setSendError(t('chat.micDenied'));
  }, [recorder.error, t]);

  const isRtl = lang === 'ar';
  const isAdmin = user?.role === 'admin';
  const friendPic = avatarUrl(friend?.profilePicture);
  const friendInitial = friend?.name?.[0]?.toUpperCase() ?? '?';

  return (
    <div className={css.shell} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className={css.chatBox}>

        {/* ── Header ── */}
        <div className={css.chatHeader}>
          {/* Back goes where this chat was opened from: the admin's inbox, or
              the friends list for everyone else. */}
          <Link
            to={user?.role === 'admin' ? '/admin/messages' : '/friends'}
            className={css.back}
          >
            {isRtl ? '→' : '←'}
          </Link>
          {/* For an admin the avatar and name open that user's admin page, so a
              recitation can be judged against the sender's record without
              hunting for them in the user list. */}
          {isAdmin ? (
            <Link to={`/admin/users/${friendId}`} className={css.friendLink}>
              <div className={css.friendAv}>
                {friendPic
                  ? <img src={friendPic} alt={friend?.name} />
                  : friendInitial}
              </div>
              <div className={css.friendInfo}>
                <span className={css.friendName}>
                  {friend?.name ?? '…'}
                  <span className={css.viewProfileHint}>{t('chat.viewProfile')}</span>
                </span>
                <span className={`${css.status} ${isOnline ? css.online : css.offline}`}>
                  {isOnline ? t('chat.online') : t('chat.offline')}
                </span>
              </div>
            </Link>
          ) : (
            <>
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
            </>
          )}
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
            return (
              <div
                key={msg._id}
                className={`${css.msgRow} ${isMine ? css.mine : ''}`}
              >
                {!isMine && (
                  <div className={css.avatar}>
                    {friendPic
                      ? <img src={friendPic} alt={friend?.name} />
                      : friendInitial}
                  </div>
                )}
                <div className={css.bubble}>
                  {msg.type === 'audio' && msg.audioUrl ? (
                    <audio className={css.audio} controls preload="metadata" src={msg.audioUrl} />
                  ) : (
                    <span className={css.msgText}>{msg.message}</span>
                  )}
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
        {recorder.recording ? (
          <div className={css.inputRow}>
            <span className={css.recDot} aria-hidden="true" />
            <span className={css.recTimer}>{formatSeconds(recorder.seconds)}</span>
            <span className={css.recHint}>{t('chat.recording')}</span>
            <button
              className={css.cancelRecBtn}
              onClick={handleCancelRecording}
              type="button"
            >
              {t('chat.cancel')}
            </button>
            <button
              className={css.sendBtn}
              onClick={() => void handleStopAndSend()}
              type="button"
              aria-label={t('chat.sendRecording')}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        ) : (
          <div className={css.inputRow}>
            <input
              ref={inputRef}
              className={css.input}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.placeholder')}
              autoComplete="off"
              disabled={uploading}
              dir={isRtl ? 'rtl' : 'ltr'}
            />
            <button
              className={css.micBtn}
              onClick={() => void recorder.start()}
              disabled={uploading}
              type="button"
              aria-label={t('chat.record')}
              title={t('chat.record')}
            >
              {uploading ? (
                <span className={css.uploadingDots}>…</span>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z" />
                  <path d="M17 11a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" />
                </svg>
              )}
            </button>
            <button
              className={css.sendBtn}
              onClick={handleSend}
              disabled={!text.trim() || uploading}
              aria-label="Send"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        )}

        {sendError && <div className={css.sendError}>{sendError}</div>}
      </div>
    </div>
  );
}
