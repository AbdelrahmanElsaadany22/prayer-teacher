import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../../../shared/api/axios';
import { useI18n } from '../../../shared/i18n/LanguageProvider';
import { avatarUrl } from '../../../shared/utils/avatar';
import { getConversations } from '../../chat/api/chat.api';
import type { Conversation } from '../../chat/types/chat.types';
import { useNotifications } from '../../notifications/context/NotificationsContext';
import css from './AdminInboxPage.module.css';

export default function AdminInboxPage() {
  const { t, lang } = useI18n();
  // Re-fetch when a message lands, so the inbox updates without a refresh.
  const { eventTick } = useNotifications();

  const [rows, setRows] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getConversations()
      .then((d) => { if (active) setRows(d); })
      .catch((err) => { if (active) setError(getApiErrorMessage(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [eventTick]);

  const formatWhen = (iso: string) => {
    const d = new Date(iso);
    const sameDay = new Date().toDateString() === d.toDateString();
    return sameDay
      ? d.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
          month: 'short',
          day: 'numeric',
        });
  };

  return (
    <div className={css.page} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <header className={css.header}>
        <span className={css.eyebrow}>{t('admin.eyebrow')}</span>
        <h1 className={css.title}>{t('inbox.title')}</h1>
        <p className={css.subtitle}>{t('inbox.subtitle')}</p>
      </header>

      {error && <div className={css.error}>{error}</div>}

      {loading ? (
        <div className={css.empty}>{t('inbox.loading')}</div>
      ) : rows.length === 0 ? (
        <div className={css.empty}>{t('inbox.empty')}</div>
      ) : (
        <ul className={css.list}>
          {rows.map((c) => {
            const pic = avatarUrl(c.profilePicture);
            return (
              <li key={c.userId}>
                <Link to={`/chat/${c.userId}`} className={css.row}>
                  <div className={css.avatar}>
                    {pic ? <img src={pic} alt={c.name} /> : (c.name?.[0]?.toUpperCase() ?? '?')}
                  </div>

                  <div className={css.identity}>
                    <span className={css.name}>{c.name}</span>
                    <span className={css.preview}>
                      {c.lastType === 'audio'
                        ? t('inbox.voiceMessage')
                        : c.lastMessage || '—'}
                    </span>
                  </div>

                  <div className={css.side}>
                    <span className={css.when}>{formatWhen(c.lastAt)}</span>
                    {c.unread > 0 && (
                      <span
                        className={css.badge}
                        title={
                          c.unread === 1
                            ? t('inbox.unreadOne')
                            : t('inbox.unread', { n: c.unread })
                        }
                      >
                        {c.unread}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
