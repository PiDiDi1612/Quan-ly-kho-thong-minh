import { Transaction, TransactionType, WorkshopCode } from '@/types';

export interface CreateReceiptData {
    materialId: string;
    quantity: number;
    workshop: WorkshopCode;
    supplier?: string;
    orderCode?: string;
    note?: string;
}

export interface CreateTransferData {
    materialId: string;
    quantity: number;
    fromWorkshop: WorkshopCode;
    toWorkshop: WorkshopCode;
    note?: string;
}

export interface ITransactionService {
    /**
     * Create inbound receipt (nhập kho)
     * @throws Error if validation fails
     */
    createInboundReceipt(data: CreateReceiptData): Promise<Transaction>;

    /**
     * Create outbound receipt (xuất kho)
     * @throws Error if insufficient stock
     */
    createOutboundReceipt(data: Omit<CreateReceiptData, 'supplier'>): Promise<Transaction>;

    /**
     * Create transfer receipt (điều chuyển)
     * Returns [OUT transaction, IN transaction]
     * @throws Error if insufficient stock or rollback failure
     */
    createTransferReceipt(data: CreateTransferData): Promise<[Transaction, Transaction]>;

    /**
     * Generate unique receipt ID
     * Format: PNK/OG/24/00001
     */
    generateReceiptId(type: TransactionType, workshop: WorkshopCode): Promise<string>;

    /**
     * Delete transaction (admin/manager only)
     * @throws Error if unauthorized or too old
     */
    deleteTransaction(transactionId: string, userId: string): Promise<void>;

    /**
     * Update transaction quantity
     * @throws Error if violates stock constraints
     */
    updateTransactionQuantity(transactionId: string, newQuantity: number): Promise<Transaction>;

    /**
     * Create batch receipt (nhập/xuất hàng loạt)
     */
    createBatchReceipt(data: {
        receiptId: string;
        receiptType: TransactionType;
        receiptWorkshop: WorkshopCode;
        receiptTime: string;
        receiptSupplier?: string;
        orderCode?: string;
        user: string;
        items: { materialId: string; quantity: number }[];
    }): Promise<{ success: boolean; error?: string }>;

    /**
     * Create batch transfer (điều chuyển hàng loạt)
     */
    createBatchTransfer(data: {
        receiptId: string;
        fromWorkshop: WorkshopCode;
        toWorkshop: WorkshopCode;
        orderCode?: string;
        user: string;
        items: { materialId: string; quantity: number }[];
    }): Promise<{ success: boolean; error?: string }>;

    /**
     * List transactions with filters
     */
    listTransactions(filters: {
        workshop?: WorkshopCode;
        type?: TransactionType;
        materialId?: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<Transaction[]>;
}
