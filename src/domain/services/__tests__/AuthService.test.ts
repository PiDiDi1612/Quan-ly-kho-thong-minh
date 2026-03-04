import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../AuthService';
import { User, Permission } from '@/types';

// Mock external dependencies
vi.mock('@/services/api', () => ({
    apiService: {
        post: vi.fn(),
        get: vi.fn(),
    }
}));

vi.mock('@/utils/authStorage', () => ({
    getAuthToken: vi.fn().mockReturnValue(null),
    getAuthUser: vi.fn().mockReturnValue(null),
    setAuthSession: vi.fn(),
    clearAuthSession: vi.fn(),
    getRememberedUsername: vi.fn().mockReturnValue(''),
    setRememberedUsername: vi.fn(),
}));

vi.mock('jwt-decode', () => ({
    jwtDecode: vi.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 }),
}));

import { apiService } from '@/services/api';
import { getAuthToken, getAuthUser, clearAuthSession } from '@/utils/authStorage';

describe('AuthService', () => {
    let service: AuthService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new AuthService();
    });

    // =============================================
    // ĐĂNG NHẬP (Login)
    // =============================================
    describe('Đăng nhập (login)', () => {
        it('Đăng nhập thành công trả về token và user', async () => {
            const mockResponse = {
                success: true,
                token: 'jwt-token',
                user: { id: 'U001', username: 'admin', role: 'ADMIN' } as any,
            };
            vi.mocked(apiService.post).mockResolvedValueOnce(mockResponse);

            const result = await service.login('admin', 'admin123');
            expect(result.success).toBe(true);
            expect(result.token).toBe('jwt-token');
        });

        it('Trả về lỗi khi tên đăng nhập/mật khẩu sai', async () => {
            vi.mocked(apiService.post).mockRejectedValueOnce(new Error('Invalid credentials'));

            const result = await service.login('wronguser', 'wrongpass');
            expect(result.success).toBe(false);
            expect(result.error).toMatch(/Invalid credentials|thất bại/i);
        });

        it('Trả về lỗi khi bị lỗi mạng', async () => {
            vi.mocked(apiService.post).mockRejectedValueOnce(new Error('Network Error'));

            const result = await service.login('admin', 'pass');
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    // =============================================
    // ĐĂNG XUẤT (Logout)
    // =============================================
    describe('Đăng xuất (logout)', () => {
        it('Gọi clearAuthSession khi đăng xuất', async () => {
            vi.mocked(getAuthToken).mockReturnValueOnce('some-token');
            vi.mocked(apiService.post).mockResolvedValueOnce({});

            await service.logout();
            expect(clearAuthSession).toHaveBeenCalled();
        });
    });

    // =============================================
    // KIỂM TRA QUYỀN (Permission)
    // =============================================
    describe('Kiểm tra Quyền (hasPermission)', () => {
        it('ADMIN luôn có mọi quyền', () => {
            const adminUser: User = {
                id: 'U001', username: 'admin', role: 'ADMIN', fullName: 'Admin',
                isActive: true, createdAt: '', permissions: [],
            };
            expect(service.hasPermission(adminUser, 'MANAGE_MATERIALS' as Permission)).toBe(true);
        });

        it('User null không có quyền nào', () => {
            expect(service.hasPermission(null, 'MANAGE_MATERIALS' as Permission)).toBe(false);
        });

        it('User có quyền cụ thể khi nằm trong danh sách permissions', () => {
            const user: User = {
                id: 'U002', username: 'staff', role: 'WAREHOUSE', fullName: 'Staff',
                isActive: true, createdAt: '', permissions: ['MANAGE_MATERIALS' as Permission],
            };
            expect(service.hasPermission(user, 'MANAGE_MATERIALS' as Permission)).toBe(true);
        });

        it('User thiếu quyền cụ thể khi không nằm trong danh sách', () => {
            const user: User = {
                id: 'U002', username: 'staff', role: 'WAREHOUSE', fullName: 'Staff',
                isActive: true, createdAt: '', permissions: [],
            };
            expect(service.hasPermission(user, 'MANAGE_MATERIALS' as Permission)).toBe(false);
        });
    });

    // =============================================
    // KHÔI PHỤC ĐĂNG NHẬP (InitAuth)
    // =============================================
    describe('Khôi phục phiên đăng nhập (initAuth)', () => {
        it('Trả về user khi token hợp lệ', () => {
            vi.mocked(getAuthToken).mockReturnValueOnce('valid-token');
            vi.mocked(getAuthUser).mockReturnValueOnce({ id: 'U001', username: 'admin', role: 'ADMIN' } as any);

            const result = service.initAuth();
            expect(result.isAuthenticated).toBe(true);
            expect(result.user?.username).toBe('admin');
        });

        it('Trả về isAuthenticated=false khi không có token', () => {
            vi.mocked(getAuthToken).mockReturnValueOnce(null);
            vi.mocked(getAuthUser).mockReturnValueOnce(null);

            const result = service.initAuth();
            expect(result.isAuthenticated).toBe(false);
        });
    });

    // =============================================
    // LẤY ROLE (getUserRole)
    // =============================================
    describe('Lấy vai trò người dùng (getUserRole)', () => {
        it('Trả về ADMIN khi user là admin', () => {
            expect(service.getUserRole({ role: 'ADMIN' } as any)).toBe('ADMIN');
        });

        it('Trả về GUEST khi user null', () => {
            expect(service.getUserRole(null)).toBe('GUEST');
        });
    });

    // =============================================
    // KIỂM TRA TOKEN HẾT HẠN (isTokenExpired)
    // =============================================
    describe('Kiểm tra Token hết hạn (isTokenExpired)', () => {
        it('Trả về true khi token rỗng', () => {
            expect(service.isTokenExpired('')).toBe(true);
        });

        it('Trả về true khi token không hợp lệ (malformed)', async () => {
            const jwtModule = await import('jwt-decode');
            vi.mocked(jwtModule.jwtDecode).mockImplementationOnce(() => { throw new Error('Invalid token'); });

            expect(service.isTokenExpired('bad-token')).toBe(true);
        });
    });
});
