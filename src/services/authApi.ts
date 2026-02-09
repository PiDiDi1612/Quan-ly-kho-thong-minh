import { User } from '@/types';

interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
  error?: string;
}

const jsonHeaders = {
  'Content-Type': 'application/json'
};

export const authApi = {
  async login(baseUrl: string, username: string, password: string): Promise<Response> {
    return fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ username, password })
    });
  },

  async logout(baseUrl: string, token?: string): Promise<Response> {
    const headers: Record<string, string> = { ...jsonHeaders };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    });
  },

  async parseLoginResponse(res: Response): Promise<LoginResponse> {
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Đăng nhập thất bại' }));
      return {
        success: false,
        token: '',
        user: {} as User,
        error: body.error || 'Đăng nhập thất bại'
      };
    }
    return res.json();
  }
};
