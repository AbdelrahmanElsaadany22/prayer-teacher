import type { z } from 'zod';
import type {
  loginSchema,
  signupSchema,
  verifySchema,
} from '../schemas/auth.schema';

export type SignupData = z.infer<typeof signupSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type VerifyData = z.infer<typeof verifySchema>;

export type User = {
  id: string;
  name: string;
  email: string;
  profilePicture?: string | null;
};

export type AuthResponse = {
  user: User;
  accessToken: string;
};

export type AuthApiResponse = {
  user?: User;
  accessToken?: string;
  access_token?: string;
};

export type SignupResponse = {
  message: string;
  email: string;
};

export type MessageResponse = {
  message: string;
};
