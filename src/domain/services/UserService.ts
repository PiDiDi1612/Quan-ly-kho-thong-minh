import { User, CreateUserData, UpdateUserData } from '@/types';
import { IUserService } from '@/domain/interfaces/IUserService';
import { apiService } from '@/services/api';

export class UserService implements IUserService {

    async listUsers(): Promise<User[]> {
        return await apiService.get<User[]>('/api/users');
    }

    async createUser(data: CreateUserData): Promise<User> {
        // Server API uses explicit ID generation and requires full object
        const newUser = {
            ...data,
            id: `U${Date.now()}`,
            isActive: true,
            createdAt: new Date().toISOString().split('T')[0],
            createdBy: data.createdBy || 'SYSTEM',
            // Default permissions for role if not provided
            permissions: data.permissions || [],
            // Password hashing is handled by server if it detects plain text not starting with prefix
            // But we should probably send it as is.
        };

        // Note: server returns { success: true }, not the user.
        await apiService.post('/api/users/save', newUser);
        return newUser as unknown as User;
    }

    async updateUser(id: string, data: UpdateUserData): Promise<User> {
        // Need to fetch current user to merge, as save is a full replace/upsert
        // We can optimize by accepting full user object in interface, but for now we fetch.
        const users = await this.listUsers();
        const existing = (Array.isArray(users) ? users : []).find(u => u.id === id);
        if (!existing) throw new Error('User not found');

        const updatedUser = {
            ...existing,
            ...data
        };

        await apiService.post('/api/users/save', updatedUser);
        return updatedUser;
    }

    async deleteUser(id: string): Promise<void> {
        await apiService.post('/api/users/delete', { id });
    }

    async updateCurrentUser(data: {
        fullName?: string;
        email?: string;
        currentPassword: string;
        newPassword?: string;
    }): Promise<User> {
        const res = await apiService.post<{ success: boolean; user: User }>('/api/users/update_self', data);
        return res.user;
    }
}

export const userService = new UserService();
