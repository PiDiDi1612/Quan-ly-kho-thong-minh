import { User } from '@/types';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';
const REMEMBERED_LOGIN_KEY = 'remembered_login';

const safeParse = <T>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const getAuthToken = (): string => {
  return localStorage.getItem(AUTH_TOKEN_KEY) || '';
};

export const getAuthUser = (): User | null => {
  return safeParse<User>(localStorage.getItem(AUTH_USER_KEY));
};

export const setAuthSession = (token: string, user: User): void => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

export const clearAuthSession = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
};

export const getRememberedUsername = (): string => {
  const payload = safeParse<{ username?: string }>(localStorage.getItem(REMEMBERED_LOGIN_KEY));
  return payload?.username || '';
};

export const setRememberedUsername = (username: string): void => {
  localStorage.setItem(REMEMBERED_LOGIN_KEY, JSON.stringify({ username }));
};

export const clearRememberedUsername = (): void => {
  localStorage.removeItem(REMEMBERED_LOGIN_KEY);
};

export const hasRememberedLogin = (): boolean => {
  return !!localStorage.getItem(REMEMBERED_LOGIN_KEY);
};
