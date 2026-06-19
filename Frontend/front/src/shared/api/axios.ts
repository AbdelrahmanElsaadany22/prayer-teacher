import axios from 'axios';

const ACCESS_TOKEN_KEY = 'salah-coach-access-token';

export const authTokenStorage = {
  get() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  set(token: string) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },
  clear() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  },
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = authTokenStorage.get();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export function getApiErrorMessage(error: unknown) {
  if (error instanceof Error && !axios.isAxiosError(error)) {
    return error.message;
  }

  if (!axios.isAxiosError(error)) {
    return 'Something went wrong. Please try again.';
  }

  const message = error.response?.data?.message as string | string[] | undefined;

  if (Array.isArray(message)) {
    return message.join(', ');
  }

  return message ?? 'Unable to connect to the server. Please try again.';
}
