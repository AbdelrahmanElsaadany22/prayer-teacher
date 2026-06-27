import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { authTokenStorage } from '../../../shared/api/axios';
import {
  getCurrentUserRequest,
  loginRequest,
  resendCodeRequest,
  signupRequest,
  verifyEmailRequest,
} from '../api/auth.api';
import type {
  LoginData,
  SignupData,
  User,
  VerifyData,
} from '../types/auth.types';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      if (!authTokenStorage.get()) {
        setIsInitializing(false);
        return;
      }

      try {
        setUser(await getCurrentUserRequest());
      } catch {
        authTokenStorage.clear();
        setUser(null);
      } finally {
        setIsInitializing(false);
      }
    }

    void restoreSession();
  }, []);

  const completeAuthentication = useCallback(
    async (response: {
      user?: User;
      accessToken?: string;
      access_token?: string;
    }) => {
      const accessToken = response.accessToken ?? response.access_token;

      if (!accessToken) {
        throw new Error(
          'The server returned an invalid login response. Restart the backend and try again.',
        );
      }

      authTokenStorage.set(accessToken);

      try {
        const authenticatedUser = await getCurrentUserRequest();
        setUser(authenticatedUser);
        return authenticatedUser;
      } catch (error) {
        authTokenStorage.clear();
        setUser(null);
        throw error;
      }
    },
    [],
  );

  const login = useCallback(
    async (data: LoginData) => {
      const response = await loginRequest(data);
      return completeAuthentication(response);
    },
    [completeAuthentication],
  );

  const signup = useCallback(async (data: SignupData) => {
    // Signup no longer logs the user in: it returns a pending-verification
    // response and emails a code that must be confirmed via verifyEmail.
    return signupRequest(data);
  }, []);

  const verifyEmail = useCallback(
    async (data: VerifyData) => {
      const response = await verifyEmailRequest(data);
      return completeAuthentication(response);
    },
    [completeAuthentication],
  );

  const resendCode = useCallback(async (email: string) => {
    await resendCodeRequest(email);
  }, []);

  function logout() {
    authTokenStorage.clear();
    setUser(null);
  }

  const refreshUser = useCallback(async () => {
    try {
      setUser(await getCurrentUserRequest());
    } catch {
      // ignore — stale context is better than forcing logout
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isInitializing,
      login,
      signup,
      verifyEmail,
      resendCode,
      logout,
      refreshUser,
    }),
    [user, isInitializing, login, signup, verifyEmail, resendCode, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
