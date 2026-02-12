import { Transaction, TransactionType, WorkshopCode } from '@/types';
import { ITransactionRepository } from './interfaces/ITransactionRepository';
import { apiService } from '@/services/api';

/**
 * Transaction repository implementation
 * Wraps apiService for transaction data access
 */
export class TransactionRepository implements ITransactionRepository {
    /**
     * Fetch all transactions from server
     */
    async fetchAll(): Promise<Transaction[]> {
        return apiService.get<Transaction[]>('/api/transactions');
    }

    /**
     * Fetch transaction by ID
     */
    async fetchById(id: string): Promise<Transaction | null> {
        try {
            return await apiService.get<Transaction>(`/api/transactions/${id}`);
        } catch (error) {
            // Return null if not found
            return null;
        }
    }

    /**
     * Create new transaction
     */
    async create(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
        return apiService.post<Transaction>('/api/transactions', transaction);
    }

    /**
     * Update existing transaction
     */
    async update(id: string, updates: Partial<Transaction>): Promise<Transaction> {
        // Warning: This sends Partial<Transaction> to an endpoint expecting full object.
        // However, TransactionService usually sends full object (spread ...tx).
        // If partial is sent, missing fields might be overwritten if not handled carefully.
        // But since we control TransactionService, we know it sends full object.
        return apiService.post<Transaction>('/api/transactions/save', updates);
    }

    /**
     * Delete transaction
     */
    async delete(id: string): Promise<void> {
        await apiService.post<void>('/api/transactions/delete_with_revert', { id });
    }

    /**
     * Batch commit transactions
     */
    async commit(data: {
        mode: 'RECEIPT' | 'TRANSFER';
        payload: any;
    }): Promise<{ success: boolean; affected?: number; error?: string }> {
        return apiService.post<{ success: boolean; affected?: number; error?: string }>('/api/transactions/commit', data);
    }

    /**
     * List transactions with optional filters
     */
    async list(filters: {
        workshop?: WorkshopCode;
        type?: TransactionType;
        materialId?: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<Transaction[]> {
        // Build query params
        const params = new URLSearchParams();

        if (filters.workshop) {
            params.append('workshop', filters.workshop);
        }
        if (filters.type) {
            params.append('type', filters.type);
        }
        if (filters.materialId) {
            params.append('materialId', filters.materialId);
        }
        if (filters.startDate) {
            params.append('startDate', filters.startDate.toISOString());
        }
        if (filters.endDate) {
            params.append('endDate', filters.endDate.toISOString());
        }

        const queryString = params.toString();
        const endpoint = queryString
            ? `/api/transactions?${queryString}`
            : '/api/transactions';

        return apiService.get<Transaction[]>(endpoint);
    }
}

// Export singleton instance
export const transactionRepository = new TransactionRepository();
