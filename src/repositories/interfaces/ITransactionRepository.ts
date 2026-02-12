import { Transaction, TransactionType, WorkshopCode } from '@/types';

export interface ITransactionRepository {
    /**
     * Fetch all transactions
     */
    fetchAll(): Promise<Transaction[]>;

    /**
     * Fetch transaction by ID
     */
    fetchById(id: string): Promise<Transaction | null>;

    /**
     * Create transaction
     */
    create(transaction: Omit<Transaction, 'id'>): Promise<Transaction>;

    /**
     * Update transaction
     */
    update(id: string, updates: Partial<Transaction>): Promise<Transaction>;

    /**
     * Delete transaction
     */
    delete(id: string): Promise<void>;

    /**
     * Batch commit transactions (Receipts or Transfers)
     */
    commit(data: {
        mode: 'RECEIPT' | 'TRANSFER';
        payload: any;
    }): Promise<{ success: boolean; affected?: number; error?: string }>;

    /**
     * List with filters
     */
    list(filters: {
        workshop?: WorkshopCode;
        type?: TransactionType;
        materialId?: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<Transaction[]>;
}
