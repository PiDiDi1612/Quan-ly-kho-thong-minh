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
  return localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY) || '';
};

export const getAuthUser = (): User | null => {
  const local = localStorage.getItem(AUTH_USER_KEY);
  if (local) return safeParse<User>(local);

  const session = sessionStorage.getItem(AUTH_USER_KEY);
  return safeParse<User>(session);
};

export const setAuthSession = (token: string, user: User, remember: boolean = false): void => {
  if (remember) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    // Clear session to avoid duplicates/confusion, though logic prioritizes local
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
  } else {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    // Clear local if user chose not to remember this time
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  }
};

export const clearAuthSession = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
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
