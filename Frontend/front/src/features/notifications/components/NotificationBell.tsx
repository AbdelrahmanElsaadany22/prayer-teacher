import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../../../shared/api/axios';
import { useNotifications } from '../context/NotificationsContext';
import css from './NotificationBell.module.css';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell() {
  const { requests, activity, count, accept, reject, dismiss } = useNotifications();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  async function handleAction(action: (id: string) => Promise<void>, id: string) {
    setBusyId(id);
    setError(null);
    try {
      await action(id);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={css.wrap} ref={wrapRef}>
      <button
        type="button"
        className={css.bell}
        aria-label={`Notifications${count ? ` (${count} new)` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <BellIcon />
        {count > 0 && <span className={css.badge}>{count > 9 ? '9+' : count}</span>}
      </button>

      {open && (
        <div className={css.panel} role="menu">
          <div className={css.panelHeader}>
            <span>Notifications</span>
            {count > 0 && <span className={css.headerCount}>{count}</span>}
          </div>

          {error && <div className={css.error}>{error}</div>}

          {count === 0 ? (
            <div className={css.empty}>You're all caught up 🎉</div>
          ) : (
            <ul className={css.list}>
              {/* ── Actionable friend requests ── */}
              {requests.map((r) => {
                const busy = busyId === r._id;
                return (
                  <li key={r._id} className={css.item}>
                    <div className={css.avatar}>
                      {r.sender?.name?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                    <div className={css.body}>
                      <p className={css.text}>
                        <strong>{r.sender?.name ?? 'Someone'}</strong> sent you a friend
                        request
                      </p>
                      <span className={css.time}>{timeAgo(r.createdAt)}</span>
                      <div className={css.actions}>
                        <button
                          type="button"
                          className={css.accept}
                          disabled={busy}
                          onClick={() => handleAction(accept, r._id)}
                        >
                          {busy ? '…' : 'Accept'}
                        </button>
                        <button
                          type="button"
                          className={css.reject}
                          disabled={busy}
                          onClick={() => handleAction(reject, r._id)}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}

              {/* ── Activity (accepted / declined) ── */}
              {activity.map((a) => (
                <li key={a.id} className={css.item}>
                  <div
                    className={`${css.avatar} ${
                      a.type === 'FRIEND_REQUEST_ACCEPTED' ? css.avatarOk : css.avatarNo
                    }`}
                  >
                    {a.type === 'FRIEND_REQUEST_ACCEPTED' ? '✓' : '✕'}
                  </div>
                  <div className={css.body}>
                    <p className={css.text}>{a.text}</p>
                    <span className={css.time}>{timeAgo(a.createdAt)}</span>
                  </div>
                  <button
                    type="button"
                    className={css.dismiss}
                    aria-label="Dismiss"
                    onClick={() => dismiss(a.id)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            className={css.viewAll}
            onClick={() => {
              setOpen(false);
              navigate('/friends');
            }}
          >
            Manage friends
          </button>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
