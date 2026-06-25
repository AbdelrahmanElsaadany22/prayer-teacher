import { useRef, useState } from 'react';
import type { HTMLInputAutoCompleteAttribute } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { useI18n } from '../../../shared/i18n/LanguageProvider';

const MASK = '✦';

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
  const [displayValue, setDisplayValue] = useState('');
  const realValue = useRef('');
  const inputId = `auth-${register.name}`;
  const isPassword = type === 'password';

  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const sel = e.target.selectionStart;

    if (isPasswordVisible) {
      realValue.current = raw;
      setDisplayValue(raw);
    } else {
      const prevLen = realValue.current.length;
      const newLen = raw.length;

      if (newLen < prevLen) {
        const deleteAt = sel ?? newLen;
        const deleteCount = prevLen - newLen;
        realValue.current =
          realValue.current.slice(0, deleteAt) +
          realValue.current.slice(deleteAt + deleteCount);
      } else if (newLen > prevLen) {
        const insertAt = sel != null ? sel - (newLen - prevLen) : prevLen;
        const newChars = raw.replace(new RegExp(MASK, 'g'), '');
        realValue.current =
          realValue.current.slice(0, insertAt) +
          newChars +
          realValue.current.slice(insertAt);
      }

      setDisplayValue(MASK.repeat(realValue.current.length));
    }

    register.onChange({ target: { name: register.name, value: realValue.current } });
  }

  function toggleVisibility() {
    const next = !isPasswordVisible;
    setIsPasswordVisible(next);
    setDisplayValue(next ? realValue.current : MASK.repeat(realValue.current.length));
  }

  return (
    <div className="auth-field">
      <label htmlFor={inputId}>{label}</label>
      <div className="auth-input-wrapper" dir={isPassword || type === 'email' ? 'ltr' : undefined}>
        {isPassword ? (
          <input
            id={inputId}
            type="text"
            dir="ltr"
            autoComplete={autoComplete}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={displayValue}
            onChange={handlePasswordChange}
            onBlur={register.onBlur}
            name={register.name}
            ref={register.ref}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : undefined}
          />
        ) : (
          <input
            id={inputId}
            type={type}
            dir={type === 'email' ? 'ltr' : undefined}
            autoComplete={autoComplete}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...register}
          />
        )}

        {isPassword && (
          <button
            className="password-toggle"
            type="button"
            onClick={toggleVisibility}
            aria-label={isPasswordVisible ? t('auth.hidePassword') : t('auth.showPassword')}
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
