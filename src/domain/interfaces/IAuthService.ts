import { User, UserRole, Permission } from '@/types';

export interface LoginResponse {
    success: boolean;
    token: string;
    user: User;
    error?: string;
}

export interface IAuthService {
    /**
     * Login with username and password
     */
    login(username: string, password: string, remember?: boolean): Promise<LoginResponse>;

    /**
     * Logout current user
     */
    logout(): Promise<void>;

    /**
     * Initialize auth state from storage
     */
    initAuth(): { user: User | null; token: string | null; isAuthenticated: boolean };

    /**
     * Check if user has specific permission
     */
    hasPermission(user: User | null, permission: Permission): boolean;

    /**
     * Get current user role
     */
    getUserRole(user: User | null): UserRole;

    /**
     * Check if token is expired
     */
    isTokenExpired(token: string): boolean;
}
