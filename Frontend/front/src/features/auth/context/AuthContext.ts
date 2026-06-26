import { createContext } from 'react';
import type { LoginData, SignupData, User } from '../types/auth.types';

export type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (data: LoginData) => Promise<User>;
  signup: (data: SignupData) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
