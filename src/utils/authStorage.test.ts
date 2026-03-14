import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  getAuthToken, 
  setAuthSession, 
  clearAuthSession, 
  getAuthUser,
  setRememberedUsername,
  getRememberedUsername
} from './authStorage';
import { User } from '@/types';

describe('authStorage Utility', () => {

  const mockUser: User = {
    id: 'u1',
    username: 'testadmin',
    fullName: 'Test Admin',
    role: 'ADMIN',
    isActive: true,
    permissions: [],
    createdAt: '2024-01-01'
  };

  const mockToken = 'test-token-123';

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  describe('setAuthSession', () => {
    it('nên lưu vào localStorage nếu chọn remember: true', () => {
      setAuthSession(mockToken, mockUser, true);
      
      expect(localStorage.getItem('auth_token')).toBe(mockToken);
      expect(localStorage.getItem('auth_user')).toContain('testadmin');
      expect(sessionStorage.getItem('auth_token')).toBeNull();
    });

    it('nên lưu vào sessionStorage nếu chọn remember: false', () => {
      setAuthSession(mockToken, mockUser, false);
      
      expect(sessionStorage.getItem('auth_token')).toBe(mockToken);
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('getAuthToken', () => {
    it('nên ưu tiên lấy token từ localStorage', () => {
      localStorage.setItem('auth_token', 'local-token');
      sessionStorage.setItem('auth_token', 'session-token');
      
      expect(getAuthToken()).toBe('local-token');
    });

    it('nên lấy từ sessionStorage nếu local không có', () => {
      sessionStorage.setItem('auth_token', 'session-token');
      expect(getAuthToken()).toBe('session-token');
    });

    it('nên trả về chuỗi rỗng nếu không có token', () => {
      expect(getAuthToken()).toBe('');
    });
  });

  describe('clearAuthSession', () => {
    it('nên xóa sạch cả local và session storage', () => {
      localStorage.setItem('auth_token', 'token');
      sessionStorage.setItem('auth_token', 'token');
      
      clearAuthSession();
      
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(sessionStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('Remembered Username', () => {
    it('nên lưu và lấy đúng username ghi nhớ', () => {
      setRememberedUsername('admin_user');
      expect(getRememberedUsername()).toBe('admin_user');
      expect(localStorage.getItem('remembered_login')).toContain('admin_user');
    });
  });

});
