import { api } from '../../../shared/api/axios';
import type {
  AuthApiResponse,
  LoginData,
  SignupData,
  User
} from '../types/auth.types';

export async function signupRequest(data: SignupData) {
  const response = await api.post<AuthApiResponse>('/auth/signup', {
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

export async function getCurrentUserRequest() {
  const response = await api.get<User>('/auth/me');
  return response.data;
}
