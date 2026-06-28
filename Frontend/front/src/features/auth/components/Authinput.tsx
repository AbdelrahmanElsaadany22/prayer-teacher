import { useState } from 'react';
import type { HTMLInputAutoCompleteAttribute } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { useI18n } from '../../../shared/i18n/LanguageProvider';

type AuthInputProps = {
  label: string;
  type?: 'text' | 'email' | 'password';
  autoComplete?: HTMLInputAutoCompleteAttribute;
  error?: string;
  register: UseFormRegisterReturn;
};

export default function AuthInput({
  label,
  type = 'text',
  autoComplete,
  error,
  register,
}: AuthInputProps) {
  const { t } = useI18n();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const inputId = `auth-${register.name}`;
  const isPassword = type === 'password';

  function toggleVisibility() {
    setIsPasswordVisible((v) => !v);
  }

  // Use a native password/text input so the value the form receives is exactly
  // what the user typed — identical to every other password field in the app.
  // (A previous custom mask implementation could diverge from native inputs,
  // making a correctly-typed password later look "incorrect".)
  const inputType = isPassword
    ? isPasswordVisible
      ? 'text'
      : 'password'
    : type;

  return (
    <div className="auth-field">
      <label htmlFor={inputId}>{label}</label>
      <div
        className="auth-input-wrapper"
        dir={isPassword || type === 'email' ? 'ltr' : undefined}
      >
        <input
          id={inputId}
          type={inputType}
          dir={isPassword || type === 'email' ? 'ltr' : undefined}
          autoComplete={autoComplete}
          autoCapitalize={isPassword ? 'off' : undefined}
          autoCorrect={isPassword ? 'off' : undefined}
          spellCheck={isPassword ? false : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...register}
        />

        {isPassword && (
          <button
            className="password-toggle"
            type="button"
            onClick={toggleVisibility}
            aria-label={
              isPasswordVisible ? t('auth.hidePassword') : t('auth.showPassword')
            }
          >
            {isPasswordVisible ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8
                  a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4
                  c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19
                  m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>

      {error && (
        <p className="field-error" id={`${inputId}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
