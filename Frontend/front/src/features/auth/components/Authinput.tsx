import { useState } from 'react';
import type { HTMLInputAutoCompleteAttribute } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

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
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const inputId = `auth-${register.name}`;
  const isPassword = type === 'password';

  return (
    <div className="auth-field">
      <label htmlFor={inputId}>{label}</label>
      <div className="auth-input-wrapper">
        <input
          id={inputId}
          type={isPassword && isPasswordVisible ? 'text' : type}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...register}
        />
        {isPassword && (
          <button
            className="password-toggle"
            type="button"
            onClick={() => setIsPasswordVisible((value) => !value)}
            aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
          >
            {isPasswordVisible ? 'Hide' : 'Show'}
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
