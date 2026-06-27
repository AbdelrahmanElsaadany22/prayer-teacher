import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../../../shared/api/axios';
import { useI18n } from '../../../shared/i18n/LanguageProvider';
import AuthInput from '../components/Authinput';
import { useAuth } from '../hooks/useAuth';
import { verifySchema } from '../schemas/auth.schema';
import type { VerifyData } from '../types/auth.types';

type VerifyLocationState = {
  email?: string;
};

const RESEND_COOLDOWN_SECONDS = 30;

export default function Verify() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyEmail, resendCode } = useAuth();
  const { t } = useI18n();

  const emailFromState = (location.state as VerifyLocationState | null)?.email;

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<VerifyData>({
    resolver: zodResolver(verifySchema),
    mode: 'onBlur',
    defaultValues: { email: emailFromState ?? '', code: '' },
  });

  const [cooldown, setCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function onSubmit(data: VerifyData) {
    try {
      await verifyEmail(data);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setError('root', { message: getApiErrorMessage(error) });
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    const email = (emailFromState ?? getValues('email') ?? '')
      .trim()
      .toLowerCase();
    if (!email) {
      setError('root', { message: t('verify.emailRequired') });
      return;
    }
    clearErrors('root');
    setResendMessage('');
    try {
      await resendCode(email);
      setResendMessage(t('verify.resentMessage'));
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      setError('root', { message: getApiErrorMessage(error) });
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="auth-heading">
          <span className="eyebrow">{t('verify.eyebrow')}</span>
          <h1>{t('verify.title')}</h1>
          <p>
            {t('verify.subtitle')}
            {emailFromState ? ` (${emailFromState})` : ''}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {!emailFromState && (
            <AuthInput
              label={t('field.email')}
              type="email"
              autoComplete="email"
              register={register('email')}
              error={errors.email?.message}
            />
          )}

          <AuthInput
            label={t('verify.codeLabel')}
            type="text"
            register={register('code')}
            error={errors.code?.message}
          />

          {errors.root?.message && (
            <div className="form-error" role="alert">
              {errors.root.message}
            </div>
          )}

          {resendMessage && (
            <div className="form-success" role="status">
              {resendMessage}
            </div>
          )}

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('verify.submitting') : t('verify.submit')}
          </button>
        </form>

        <p className="auth-switch">
          {t('verify.resendPrompt')}{' '}
          <button
            type="button"
            className="auth-link-button"
            disabled={cooldown > 0}
            onClick={() => void handleResend()}
          >
            {cooldown > 0
              ? t('verify.resendCooldown').replace('{seconds}', String(cooldown))
              : t('verify.resendLink')}
          </button>
        </p>

        <p className="auth-switch">
          <Link to="/login">{t('verify.backToLogin')}</Link>
        </p>
      </div>
    </section>
  );
}
