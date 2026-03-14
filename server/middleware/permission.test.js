import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { 
  validateFields, 
  validateNumber, 
  hasPermission,
  VALID_ROLES
} = require('./permission.cjs');

describe('Permission Middleware Logic', () => {

  describe('validateFields', () => {
    it('nên trả về null nếu tất cả các trường hợp lệ', () => {
      const fields = { name: 'Vật tư A', unit: 'Cái' };
      expect(validateFields(fields)).toBeNull();
    });

    it('nên trả về lỗi nếu có trường bị trống', () => {
      const fields = { name: 'Vật tư A', unit: '' };
      expect(validateFields(fields)).toContain('Trường "unit" không được để trống');
    });

    it('nên trả về lỗi nếu trường là null hoặc undefined', () => {
      expect(validateFields({ a: null })).toContain('Trường "a"');
      expect(validateFields({ a: undefined })).toContain('Trường "a"');
    });
  });

  describe('validateNumber', () => {
    it('nên trả về null nếu là số hợp lệ và lớn hơn min', () => {
      expect(validateNumber(10, 'Số lượng')).toBeNull();
      expect(validateNumber('10.5', 'Số lượng')).toBeNull();
    });

    it('nên trả về lỗi nếu không phải là số', () => {
      expect(validateNumber('abc', 'Số lượng')).toContain('phải là số hợp lệ');
    });

    it('nên trả về lỗi nếu nhỏ hơn hoặc bằng min', () => {
      expect(validateNumber(0, 'Số lượng', 0)).toContain('phải lớn hơn 0');
      expect(validateNumber(-1, 'Số lượng', 0)).toContain('phải lớn hơn 0');
    });
  });

  describe('hasPermission', () => {
    const adminUser = { role: 'ADMIN', permissions: [] };
    const warehouseUser = { role: 'WAREHOUSE', permissions: [] };
    const guestUser = { role: 'GUEST', permissions: [] };

    it('ADMIN nên có mọi quyền', () => {
      expect(hasPermission(adminUser, 'ANY_PERMISSION')).toBe(true);
      expect(hasPermission(adminUser, 'MANAGE_SETTINGS')).toBe(true);
    });

    it('Nên kiểm tra quyền theo role (WAREHOUSE)', () => {
      // WAREHOUSE có MANAGE_WAREHOUSE nhưng không có MANAGE_USERS
      expect(hasPermission(warehouseUser, 'MANAGE_WAREHOUSE')).toBe(true);
      expect(hasPermission(warehouseUser, 'MANAGE_USERS')).toBe(false);
    });

    it('Nên kiểm tra quyền theo role (GUEST)', () => {
      expect(hasPermission(guestUser, 'VIEW_MATERIAL')).toBe(true);
      expect(hasPermission(guestUser, 'MANAGE_WAREHOUSE')).toBe(false);
    });

    it('Nên hỗ trợ quyền quy định rõ ràng (explicit permissions)', () => {
      const customUser = { role: 'GUEST', permissions: ['SPECIAL_ACCESS'] };
      expect(hasPermission(customUser, 'SPECIAL_ACCESS')).toBe(true);
      // Quyền mặc định của GUEST vẫn hoạt động
      expect(hasPermission(customUser, 'VIEW_MATERIAL')).toBe(true);
    });

    it('Nên trả về false nếu không có user', () => {
      expect(hasPermission(null, 'VIEW_MATERIAL')).toBe(false);
    });
  });

});
