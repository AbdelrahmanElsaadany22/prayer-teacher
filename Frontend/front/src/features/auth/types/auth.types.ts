import type { z } from 'zod';
import type { loginSchema, signupSchema } from '../schemas/auth.schema';

export type SignupData = z.infer<typeof signupSchema>;
export type LoginData = z.infer<typeof loginSchema>;

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
