import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../../../shared/api/axios';
import { useI18n } from '../../../shared/i18n/LanguageProvider';
import AuthInput from '../components/Authinput';
import { useAuth } from '../hooks/useAuth';
import { loginSchema } from '../schemas/auth.schema';
import type { LoginData } from '../types/auth.types';

type LoginLocationState = {
  from?: {
    pathname?: string;
  };
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { t } = useI18n();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  async function onSubmit(data: LoginData) {
    try {
      await login(data);
      const state = location.state as LoginLocationState | null;
      navigate(state?.from?.pathname ?? '/dashboard', { replace: true });
    } catch (error) {
      // An unverified account is rejected with 403 — send them to verify.
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        navigate('/verify', { state: { email: data.email } });
        return;
      }
      setError('root', {
        message: getApiErrorMessage(error),
      });
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="auth-heading">
          <span className="eyebrow">{t('login.eyebrow')}</span>
          <h1>{t('login.title')}</h1>
          <p>{t('login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <AuthInput
            label={t('field.email')}
            type="email"
            autoComplete="email"
            register={register('email')}
            error={errors.email?.message}
          />

          <AuthInput
            label={t('field.password')}
            type="password"
            autoComplete="current-password"
            register={register('password')}
            error={errors.password?.message}
          />

          {errors.root?.message && (
            <div className="form-error" role="alert">
              {errors.root.message}
            </div>
          )}

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('login.submitting') : t('login.submit')}
          </button>
        </form>

        <p className="auth-switch">
          {t('login.switch')} <Link to="/signup">{t('login.switchLink')}</Link>
        </p>
      </div>
    </section>
  );
}
