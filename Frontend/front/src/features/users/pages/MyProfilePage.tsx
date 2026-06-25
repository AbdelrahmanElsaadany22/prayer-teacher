import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { useI18n } from '../../../shared/i18n/LanguageProvider';
import { api, getApiErrorMessage } from '../../../shared/api/axios';
import { uploadProfilePicture } from '../api/users.api';
import css from './MyProfilePage.module.css';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export default function MyProfilePage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);

  const [picFilename, setPicFilename] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    api.get<{ profilePicture?: string | null }>('/user/current')
      .then((res) => { if (res.data.profilePicture) setPicFilename(res.data.profilePicture); })
      .catch(() => {});
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);
    try {
      const res = await uploadProfilePicture(file);
      setPicFilename(res.filename);
      setMsg({ type: 'ok', text: t('myProfile.uploadSuccess') });
    } catch (err) {
      setMsg({ type: 'err', text: getApiErrorMessage(err) });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const avatarSrc = picFilename ? `${API_BASE}/uploads/${picFilename}` : null;
  const initial = user?.name?.[0]?.toUpperCase() ?? '?';

  return (
    <div className={css.page}>
      <span className={css.eyebrow}>{t('myProfile.eyebrow')}</span>
      <h1 className={css.title}>{t('myProfile.title')}</h1>

      <div className={css.card}>
        <div className={css.avatarWrap}>
          <div className={css.avatar}>
            {avatarSrc ? <img src={avatarSrc} alt={user?.name} /> : initial}
          </div>
          <div className={css.uploadArea}>
            <p className={css.picLabel}>{t('myProfile.picture')}</p>
            <button
              type="button"
              className={css.uploadBtn}
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? t('myProfile.uploading') : t('myProfile.uploadBtn')}
            </button>
            <p className={css.formats}>{t('myProfile.allowedFormats')}</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className={css.fileInput}
              onChange={handleFileChange}
            />
          </div>
        </div>

        {msg && (
          <p className={msg.type === 'ok' ? css.successMsg : css.errorMsg}>{msg.text}</p>
        )}

        <div className={css.userInfo}>
          <div className={css.infoRow}>
            <span className={css.infoLabel}>{t('field.name')}</span>
            <span className={css.infoValue}>{user?.name}</span>
          </div>
          <div className={css.infoRow}>
            <span className={css.infoLabel}>{t('field.email')}</span>
            <span className={css.infoValue}>{user?.email}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
