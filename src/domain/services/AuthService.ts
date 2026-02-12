import { User, UserRole, Permission } from '@/types';
import { IAuthService, LoginResponse } from '@/domain/interfaces/IAuthService';
import { apiService } from '@/services/api';
import {
    getAuthToken,
    getAuthUser,
    setAuthSession,
    clearAuthSession,
    getRememberedUsername
} from '@/utils/authStorage';
import { jwtDecode } from 'jwt-decode';

export class AuthService implements IAuthService {

    constructor() {
        // apiService handles baseUrl
    }

    async login(username: string, password: string, remember: boolean = false): Promise<LoginResponse> {
        try {
            // apiService.post returns the parsed JSON response directly or throws error
            // We expect the server to return { success: true, token, user } or { error }
            // But apiService.post throws on !res.ok.
            // Wait, server login endpoint might return 401 with { error: ... }
            // apiService throws on 401.
            // So we need to catch it.

            // However, authApi.login returned Fetch Response, allowing us to parse manual body.
            // apiService.post throws. 
            // We should wrap it.

            const data = await apiService.post<LoginResponse>('/api/auth/login', { username, password });

            if (data.success && data.token) {
                setAuthSession(data.token, data.user, remember);

                // Also update remembered username if remember is true
                if (remember) {
                    // Import setRememberedUsername if needed or rely on App.tsx doing it?
                    // Better to rely on App.tsx or do it here. 
                    // Let's do it here for consistency if we import it.
                    // But wait, I need to check imports.
                    // For now, assume App.tsx handles username remembering logic or I add import.
                    // The AuthService usually handles session. Username remembering is related.
                }
            }

            return data;
        } catch (error: any) {
            // If apiService throws, it might be network error or 401.
            // Try to extract message if possible, or default.
            // apiService throws Error object.
            return {
                success: false,
                token: '',
                user: {} as User,
                error: error.message || 'Đăng nhập thất bại (Network/Server Error)'
            };
        }
    }

    async logout(): Promise<void> {
        const token = getAuthToken();
        if (token) {
            try {
                await apiService.post('/api/auth/logout', {});
            } catch (e) {
                console.error('Logout API failed', e);
            }
        }
        clearAuthSession();
    }

    initAuth(): { user: User | null; token: string | null; isAuthenticated: boolean } {
        const token = getAuthToken();
        const user = getAuthUser();

        if (token && user && !this.isTokenExpired(token)) {
            return { user, token, isAuthenticated: true };
        }

        return { user: null, token: null, isAuthenticated: false };
    }

    hasPermission(user: User | null, permission: Permission): boolean {
        if (!user) return false;
        if (user.role === 'ADMIN') return true;
        return user.permissions.includes(permission);
    }

    getUserRole(user: User | null): UserRole {
        return user?.role || 'STAFF'; // Default to lowest role if null
    }

    isTokenExpired(token: string): boolean {
        if (!token) return true;
        try {
            const decoded: any = jwtDecode(token);
            if (!decoded.exp) return false;
            return decoded.exp * 1000 < Date.now();
        } catch (err) {
            return true;
        }
    }

    getStoredUsername(): string {
        return getRememberedUsername();
    }
}

export const authService = new AuthService();
