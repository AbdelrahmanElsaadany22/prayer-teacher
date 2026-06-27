import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../../../shared/api/axios';
import { useI18n } from '../../../shared/i18n/LanguageProvider';
import AuthInput from '../components/Authinput';
import { useAuth } from '../hooks/useAuth';
import { signupSchema } from '../schemas/auth.schema';
import type { SignupData } from '../types/auth.types';

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { t } = useI18n();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupData>({
    resolver: zodResolver(signupSchema),
    mode: 'onBlur',
  });

  async function onSubmit(data: SignupData) {
    try {
      const response = await signup(data);
      navigate('/verify', {
        replace: true,
        state: { email: response.email },
      });
    } catch (error) {
      setError('root', {
        message: getApiErrorMessage(error),
      });
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="auth-heading">
          <span className="eyebrow">{t('signup.eyebrow')}</span>
          <h1>{t('signup.title')}</h1>
          <p>{t('signup.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <AuthInput
            label={t('field.name')}
            autoComplete="name"
            register={register('name')}
            error={errors.name?.message}
          />

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
            autoComplete="new-password"
            register={register('password')}
            error={errors.password?.message}
          />

          <AuthInput
            label={t('field.confirmPassword')}
            type="password"
            autoComplete="new-password"
            register={register('confirmPassword')}
            error={errors.confirmPassword?.message}
          />

          {errors.root?.message && (
            <div className="form-error" role="alert">
              {errors.root.message}
            </div>
          )}

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('signup.submitting') : t('signup.submit')}
          </button>
        </form>

        <p className="auth-switch">
          {t('signup.switch')} <Link to="/login">{t('signup.switchLink')}</Link>
        </p>
      </div>
    </section>
  );
}
