import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiService } from './api';

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    disconnect: vi.fn()
  }))
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    clear: () => { store = {}; },
    removeItem: (key: string) => { delete store[key]; }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch
global.fetch = vi.fn();

describe('ApiService', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    // Reset apiService state if possible or use a fresh instance if exported
    // Since it's a singleton exported, we might need to reset its internal config
    apiService.setConfig('SERVER', ''); 
  });

  describe('determineBaseUrl', () => {
    it('nên trả về 127.0.0.1:3000 ở chế độ SERVER', () => {
      apiService.setConfig('SERVER', '');
      expect(apiService.getBaseUrl()).toBe('http://127.0.0.1:3000');
    });

    it('nên trả về IP máy chủ ở chế độ CLIENT', () => {
      apiService.setConfig('CLIENT', '192.168.1.5');
      expect(apiService.getBaseUrl()).toBe('http://192.168.1.5:3000');
    });
  });

  describe('CRUD Methods', () => {
    it('nên gọi fetch với URL và Header đúng cho GET', async () => {
      const mockData = { id: 1, name: 'Test' };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockData))
      });

      const result = await apiService.get('/api/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('127.0.0.1:3000/api/test'),
        expect.objectContaining({ method: 'GET' })
      );
      expect(result).toEqual(mockData);
    });

    it('nên ném lỗi nếu API trả về lỗi', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: 'Lỗi máy chủ' })
      });

      await expect(apiService.get('/api/error')).rejects.toThrow('Lỗi máy chủ');
    });

    it('nên gửi body JSON cho POST', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{"success":true}')
      });

      const body = { name: 'New Item' };
      await apiService.post('/api/items', body);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body)
        })
      );
    });
  });

  describe('401 Handling', () => {
    it('nên dispatch event api-unauthorized khi nhận lỗi 401', async () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: 'Hết hạn' })
      });

      try {
        await apiService.get('/api/protected');
      } catch (e) {
        // expect throw
      }

      expect(dispatchSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
      expect((dispatchSpy.mock.calls[0][0] as CustomEvent).type).toBe('api-unauthorized');
    });
  });

});
