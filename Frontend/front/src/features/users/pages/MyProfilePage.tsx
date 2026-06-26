import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import { useI18n } from '../../../shared/i18n/LanguageProvider';
import { LANGUAGES } from '../../../shared/i18n/translations';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { api, getApiErrorMessage } from '../../../shared/api/axios';
import { uploadProfilePicture, updateName, changePassword } from '../api/users.api';
import { avatarUrl } from '../../../shared/utils/avatar';
import css from './MyProfilePage.module.css';

type Msg = { type: 'ok' | 'err'; text: string };

export default function MyProfilePage() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);

  const [picUrl, setPicUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [picMsg, setPicMsg] = useState<Msg | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<Msg | null>(null);

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<Msg | null>(null);

  useEffect(() => {
    api.get<{ profilePicture?: string | null }>('/user/current')
      .then((res) => { if (res.data.profilePicture) setPicUrl(avatarUrl(res.data.profilePicture)); })
      .catch(() => {});
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setPicMsg(null);
    try {
      const res = await uploadProfilePicture(file);
      setPicUrl(res.url);
      setPicMsg({ type: 'ok', text: t('myProfile.uploadSuccess') });
    } catch (err) {
      setPicMsg({ type: 'err', text: getApiErrorMessage(err) });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function startEditName() {
    setNameValue(user?.name ?? '');
    setNameMsg(null);
    setEditingName(true);
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = nameValue.trim();
    if (trimmed.length < 2 || trimmed.length > 80) return;
    setSavingName(true);
    setNameMsg(null);
    try {
      await updateName(trimmed);
      await refreshUser();
      setEditingName(false);
      setNameMsg({ type: 'ok', text: t('myProfile.nameUpdated') });
    } catch (err) {
      setNameMsg({ type: 'err', text: getApiErrorMessage(err) });
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: 'err', text: t('myProfile.passwordMismatch') });
      return;
    }
    setSavingPwd(true);
    setPwdMsg(null);
    try {
      await changePassword(currentPwd, newPwd);
      setPwdMsg({ type: 'ok', text: t('myProfile.passwordUpdated') });
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (err) {
      setPwdMsg({ type: 'err', text: getApiErrorMessage(err) });
    } finally {
      setSavingPwd(false);
    }
  }

  const initial = user?.name?.[0]?.toUpperCase() ?? '?';

  return (
    <div className={css.page}>
      <span className={css.eyebrow}>{t('myProfile.eyebrow')}</span>
      <h1 className={css.title}>{t('myProfile.title')}</h1>

      {/* ── Profile info card ── */}
      <div className={css.card}>
        <div className={css.avatarWrap}>
          <div className={css.avatar}>
            {picUrl ? <img src={picUrl} alt={user?.name} /> : initial}
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

        {picMsg && (
          <p className={picMsg.type === 'ok' ? css.successMsg : css.errorMsg}>{picMsg.text}</p>
        )}

        <div className={css.userInfo}>
          {/* Name row */}
          <div className={`${css.infoRow} ${editingName ? css.infoRowEdit : ''}`}>
            <span className={css.infoLabel}>{t('field.name')}</span>
            {editingName ? (
              <form className={css.inlineForm} onSubmit={handleSaveName}>
                <input
                  className={css.fieldInput}
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  minLength={2}
                  maxLength={80}
                  autoFocus
                />
                <div className={css.editActions}>
                  <button
                    type="submit"
                    className={css.saveBtn}
                    disabled={savingName || nameValue.trim().length < 2}
                  >
                    {savingName ? t('myProfile.updating') : t('myProfile.saveName')}
                  </button>
                  <button
                    type="button"
                    className={css.cancelBtn}
                    onClick={() => { setEditingName(false); setNameMsg(null); }}
                  >
                    {t('myProfile.cancelEdit')}
                  </button>
                </div>
              </form>
            ) : (
              <div className={css.infoValueRow}>
                <span className={css.infoValue}>{user?.name}</span>
                <button type="button" className={css.editBtn} onClick={startEditName}>
                  {t('myProfile.editName')}
                </button>
              </div>
            )}
          </div>

          {/* Email row */}
          <div className={css.infoRow}>
            <span className={css.infoLabel}>{t('field.email')}</span>
            <span className={css.infoValue}>{user?.email}</span>
          </div>
        </div>

        {nameMsg && (
          <p className={nameMsg.type === 'ok' ? css.successMsg : css.errorMsg}>{nameMsg.text}</p>
        )}
      </div>

      {/* ── Change password card ── */}
      <div className={`${css.card} ${css.cardSpaced}`}>
        <p className={css.sectionHeading}>{t('myProfile.changePasswordSection')}</p>
        <form className={css.passwordForm} onSubmit={handleChangePassword}>
          <div className={css.formGroup}>
            <label className={css.formLabel}>{t('myProfile.currentPassword')}</label>
            <input
              type="password"
              className={css.fieldInput}
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div className={css.formGroup}>
            <label className={css.formLabel}>{t('myProfile.newPassword')}</label>
            <input
              type="password"
              className={css.fieldInput}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              required
            />
          </div>
          <div className={css.formGroup}>
            <label className={css.formLabel}>{t('myProfile.confirmNewPassword')}</label>
            <input
              type="password"
              className={css.fieldInput}
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              required
            />
          </div>
          {pwdMsg && (
            <p className={pwdMsg.type === 'ok' ? css.successMsg : css.errorMsg}>{pwdMsg.text}</p>
          )}
          <button
            type="submit"
            className={css.uploadBtn}
            disabled={savingPwd || !currentPwd || !newPwd || !confirmPwd}
          >
            {savingPwd ? t('myProfile.updating') : t('myProfile.updatePassword')}
          </button>
        </form>
      </div>

      {/* ── Preferences card ── */}
      <div className={`${css.card} ${css.cardSpaced}`}>
        <p className={css.sectionHeading}>{t('myProfile.preferencesSection')}</p>
        <div className={css.userInfo}>
          <div className={css.infoRow}>
            <span className={css.infoLabel}>{t('myProfile.language')}</span>
            <div className={css.prefPill}>
              {LANGUAGES.map(({ code, label }) => (
                <button
                  key={code}
                  type="button"
                  className={`${css.prefOpt}${lang === code ? ` ${css.prefOptActive}` : ''}`}
                  onClick={() => setLang(code)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className={css.infoRow}>
            <span className={css.infoLabel}>{t('myProfile.appearance')}</span>
            <div className={css.prefPill}>
              <button
                type="button"
                className={`${css.prefOpt}${theme === 'dark' ? ` ${css.prefOptActive}` : ''}`}
                onClick={() => theme !== 'dark' && toggleTheme()}
              >
                {t('myProfile.dark')}
              </button>
              <button
                type="button"
                className={`${css.prefOpt}${theme === 'light' ? ` ${css.prefOptActive}` : ''}`}
                onClick={() => theme !== 'light' && toggleTheme()}
              >
                {t('myProfile.light')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Logout ── */}
      <button
        type="button"
        className={css.logoutBtn}
        onClick={() => { logout(); navigate('/login', { replace: true }); }}
      >
        {t('myProfile.logout')}
      </button>
    </div>
  );
}
