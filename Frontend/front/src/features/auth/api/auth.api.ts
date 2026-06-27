import { api } from '../../../shared/api/axios';
import type {
  AuthApiResponse,
  LoginData,
  MessageResponse,
  SignupData,
  SignupResponse,
  User,
  VerifyData,
} from '../types/auth.types';

export async function signupRequest(data: SignupData) {
  const response = await api.post<SignupResponse>('/auth/signup', {
    name: data.name,
    email: data.email,
    password: data.password,
  });

  return response.data;
}

export async function loginRequest(data: LoginData) {
  const response = await api.post<AuthApiResponse>('/auth/login', data);
  return response.data;
}

export async function verifyEmailRequest(data: VerifyData) {
  const response = await api.post<AuthApiResponse>('/auth/verify', data);
  return response.data;
}

export async function resendCodeRequest(email: string) {
  const response = await api.post<MessageResponse>('/auth/resend-code', {
    email,
  });
  return response.data;
}

export async function getCurrentUserRequest() {
  const response = await api.get<User>('/auth/me');
  return response.data;
}
