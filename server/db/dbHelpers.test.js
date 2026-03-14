import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { 
  hashPassword, 
  verifyPassword, 
  roundQty, 
  todayISO, 
  parseJsonSafe, 
  txId 
} = require('./dbHelpers.cjs');

describe('Database Helpers (Pure Logic)', () => {

  describe('hashPassword & verifyPassword', () => {
    it('nên mã hóa mật khẩu và xác thực thành công', () => {
      const password = 'MySecretPassword123';
      const hash = hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).toContain('pbkdf2$');
      expect(verifyPassword(password, hash)).toBe(true);
    });

    it('nên trả về false nếu sai mật khẩu', () => {
      const password = 'CorrectPassword';
      const wrongPassword = 'WrongPassword';
      const hash = hashPassword(password);
      
      expect(verifyPassword(wrongPassword, hash)).toBe(false);
    });

    it('không thể đảo ngược hash (2 lần hash cùng pass phải khác nhau do salt)', () => {
      const password = 'test';
      const hash1 = hashPassword(password);
      const hash2 = hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('roundQty', () => {
    it('nên làm tròn đúng số thập phân (tối đa 2 chữ số)', () => {
      expect(roundQty(10.1234)).toBe(10.12);
      expect(roundQty(10.126)).toBe(10.13);
      expect(roundQty(10)).toBe(10);
    });

    it('nên xử lý lỗi floating point chính xác (0.1 + 0.2)', () => {
      const val = 0.1 + 0.2; 
      expect(roundQty(val)).toBe(0.3);
    });

    it('nên trả về 0 nếu đầu vào không phải là số', () => {
      expect(roundQty(null)).toBe(0);
      expect(roundQty('abc')).toBe(0);
    });
  });

  describe('todayISO', () => {
    it('nên trả về định dạng YYYY-MM-DD', () => {
      const iso = todayISO();
      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('parseJsonSafe', () => {
    it('nên parse JSON hợp lệ thành công', () => {
      const json = '{"key": "value"}';
      expect(parseJsonSafe(json, {})).toEqual({ key: 'value' });
    });

    it('nên trả về giá trị fallback nếu JSON lỗi', () => {
      const invalidJson = '{"key": "value"';
      const fallback = { error: true };
      expect(parseJsonSafe(invalidJson, fallback)).toEqual(fallback);
    });
  });

  describe('txId', () => {
    it('nên tạo ID duy nhất với prefix mặc định', () => {
      const id1 = txId();
      const id2 = txId();
      expect(id1.startsWith('tx-')).toBe(true);
      expect(id1).not.toBe(id2);
    });

    it('nên sử dụng prefix tùy chỉnh', () => {
      const id = txId('rc');
      expect(id.startsWith('rc-')).toBe(true);
    });
  });

});
