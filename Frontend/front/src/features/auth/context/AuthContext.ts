import { createContext } from 'react';
import type {
  LoginData,
  SignupData,
  SignupResponse,
  User,
  VerifyData,
} from '../types/auth.types';

export type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (data: LoginData) => Promise<User>;
  signup: (data: SignupData) => Promise<SignupResponse>;
  verifyEmail: (data: VerifyData) => Promise<User>;
  resendCode: (email: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
