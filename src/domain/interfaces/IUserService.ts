import { User, CreateUserData, UpdateUserData } from '@/types';

export interface IUserService {
    /**
     * List all users
     */
    listUsers(): Promise<User[]>;

    /**
     * Create a new user
     */
    createUser(data: CreateUserData): Promise<User>;

    /**
     * Update existing user
     */
    updateUser(id: string, data: UpdateUserData): Promise<User>;

    /**
     * Delete user
     */
    deleteUser(id: string): Promise<void>;

    /**
     * Change password
     */
    updateCurrentUser(data: {
        fullName?: string;
        email?: string;
        currentPassword: string;
        newPassword?: string;
    }): Promise<User>;
}
