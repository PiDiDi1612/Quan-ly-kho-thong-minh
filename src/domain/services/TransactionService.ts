import { Transaction, TransactionType, WorkshopCode } from '@/types';
import {
    ITransactionService,
    CreateReceiptData,
    CreateTransferData
} from '@/domain/interfaces/ITransactionService';
import { transactionRepository } from '@/repositories';
import { inventoryService } from './InventoryService';
import { BUSINESS_CONSTANTS } from '@/domain/constants';

/**
 * Transaction Service - Handles all receipt creation operations
 * Includes rollback mechanism for transfers
 */
export class TransactionService implements ITransactionService {

    /**
     * Generate unique receipt ID
     * Format: PNK/OG/24/00001
     */
    async generateReceiptId(
        type: TransactionType,
        workshop: WorkshopCode
    ): Promise<string> {
        const today = new Date();
        const year = today.getFullYear().toString().slice(-2);

        const prefix = BUSINESS_CONSTANTS.RECEIPT_PREFIXES[type];
        const yearPrefix = `${prefix}/${workshop}/${year}/`;

        let allTxs = await transactionRepository.list({
            type,
            workshop
        });
        if (!Array.isArray(allTxs)) allTxs = [];

        const samePeriod = allTxs.filter(t => t.receiptId.startsWith(yearPrefix));

        let maxNum = 0;
        for (const tx of samePeriod) {
            const parts = tx.receiptId.split('/');
            if (parts.length >= 4) {
                const num = parseInt(parts[3], 10);
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                }
            }
        }

        const nextNum = maxNum + 1;
        const paddedNum = nextNum.toString().padStart(5, '0');

        return `${prefix}/${workshop}/${year}/${paddedNum}`;
    }

    /**
     * Create inbound receipt (nhập kho)
     */
    async createInboundReceipt(data: CreateReceiptData): Promise<Transaction> {
        if (!data.materialId || data.quantity <= 0) {
            throw new Error('Invalid material or quantity');
        }

        const receiptId = await this.generateReceiptId(
            TransactionType.IN,
            data.workshop
        );

        const newTx: Partial<Transaction> = {
            id: crypto.randomUUID(),
            receiptId,
            type: TransactionType.IN,
            materialId: data.materialId,
            materialName: '',
            workshop: data.workshop,
            quantity: data.quantity,
            date: new Date().toISOString(),
            user: '',
            supplier: data.supplier,
            orderCode: data.orderCode,
            note: data.note,
        };

        const created = await transactionRepository.create(newTx as Transaction);
        inventoryService.invalidateCache();
        return created;
    }

    /**
     * Create outbound receipt (xuất kho)
     */
    async createOutboundReceipt(
        data: Omit<CreateReceiptData, 'supplier'>
    ): Promise<Transaction> {
        if (!data.materialId || data.quantity <= 0) {
            throw new Error('Invalid material or quantity');
        }

        await inventoryService.loadTransactions();

        inventoryService.validateStockAvailability(
            data.materialId,
            data.workshop,
            data.quantity
        );

        const receiptId = await this.generateReceiptId(
            TransactionType.OUT,
            data.workshop
        );

        const newTx: Partial<Transaction> = {
            id: crypto.randomUUID(),
            receiptId,
            type: TransactionType.OUT,
            materialId: data.materialId,
            materialName: '',
            workshop: data.workshop,
            quantity: data.quantity,
            date: new Date().toISOString(),
            user: '',
            orderCode: data.orderCode,
            note: data.note,
        };

        const created = await transactionRepository.create(newTx as Transaction);
        inventoryService.invalidateCache();
        return created;
    }

    /**
     * Create transfer receipt (điều chuyển)
     */
    async createTransferReceipt(
        data: CreateTransferData
    ): Promise<[Transaction, Transaction]> {
        if (data.fromWorkshop === data.toWorkshop) {
            throw new Error('Cannot transfer to the same workshop');
        }

        if (!data.materialId || data.quantity <= 0) {
            throw new Error('Invalid material or quantity');
        }

        await inventoryService.loadTransactions();

        inventoryService.validateStockAvailability(
            data.materialId,
            data.fromWorkshop,
            data.quantity
        );

        const receiptId = await this.generateReceiptId(
            TransactionType.TRANSFER,
            data.fromWorkshop
        );

        const outTx: Partial<Transaction> = {
            id: crypto.randomUUID(),
            receiptId,
            type: TransactionType.TRANSFER,
            materialId: data.materialId,
            materialName: '',
            workshop: data.fromWorkshop,
            quantity: data.quantity,
            date: new Date().toISOString(),
            user: '',
            note: data.note || `Điều chuyển → ${data.toWorkshop}`,
        };

        let createdOut: Transaction;
        let createdIn: Transaction | null = null;

        try {
            createdOut = await transactionRepository.create(outTx as Transaction);

            const inTx: Partial<Transaction> = {
                ...outTx,
                id: crypto.randomUUID(),
                receiptId: receiptId + '-IN',
                workshop: data.toWorkshop,
                note: data.note || `Điều chuyển ← ${data.fromWorkshop}`,
            };

            createdIn = await transactionRepository.create(inTx as Transaction);
            inventoryService.invalidateCache();

            return [createdOut, createdIn];

        } catch (error: any) {
            if (createdOut! && !createdIn) {
                console.error('Transfer IN creation failed, attempting rollback...');
                try {
                    await transactionRepository.delete(createdOut.id);
                    console.log('Successfully rolled back OUT transaction:', createdOut.id);
                } catch (rollbackError: any) {
                    console.error('CRITICAL: Rollback failed!', {
                        outTransactionId: createdOut.id,
                        receiptId: createdOut.receiptId,
                        error: rollbackError.message
                    });
                }
            }
            throw new Error(`Transfer failed: ${error.message}`);
        }
    }

    async deleteTransaction(transactionId: string, userId: string): Promise<void> {
        await transactionRepository.delete(transactionId);
        inventoryService.invalidateCache();
    }

    async updateTransactionQuantity(
        transactionId: string,
        newQuantity: number
    ): Promise<Transaction> {
        if (newQuantity <= 0) {
            throw new Error('Invalid quantity');
        }

        const tx = await transactionRepository.fetchById(transactionId);
        if (!tx) {
            throw new Error('Transaction not found');
        }

        if (tx.type === TransactionType.OUT || tx.type === TransactionType.TRANSFER) {
            const currentStock = await inventoryService.calculateStock(tx.materialId, tx.workshop);
            const availableWithoutThisTx = currentStock + tx.quantity;

            if (availableWithoutThisTx < newQuantity) {
                throw new Error(`Insufficient stock. Available: ${availableWithoutThisTx}, Requested: ${newQuantity}`);
            }
        }

        const updated = await transactionRepository.update(transactionId, {
            ...tx,
            quantity: newQuantity
        });

        inventoryService.invalidateCache();
        return updated;
    }

    async createBatchReceipt(data: {
        receiptId: string;
        receiptType: TransactionType;
        receiptWorkshop: WorkshopCode;
        receiptTime: string;
        receiptSupplier?: string;
        orderCode?: string;
        user: string;
        items: { materialId: string; quantity: number }[];
    }): Promise<{ success: boolean; error?: string }> {
        await inventoryService.loadTransactions();

        if (data.receiptType === TransactionType.OUT) {
            for (const item of data.items) {
                inventoryService.validateStockAvailability(
                    item.materialId,
                    data.receiptWorkshop,
                    item.quantity
                );
            }
        }

        const result = await transactionRepository.commit({
            mode: 'RECEIPT',
            payload: data
        });

        if (result.success) {
            inventoryService.invalidateCache();
        }

        return result;
    }

    async createBatchTransfer(data: {
        receiptId: string;
        fromWorkshop: WorkshopCode;
        toWorkshop: WorkshopCode;
        orderCode?: string;
        user: string;
        items: { materialId: string; quantity: number }[];
    }): Promise<{ success: boolean; error?: string }> {
        await inventoryService.loadTransactions();

        for (const item of data.items) {
            inventoryService.validateStockAvailability(
                item.materialId,
                data.fromWorkshop,
                item.quantity
            );
        }

        const result = await transactionRepository.commit({
            mode: 'TRANSFER',
            payload: data
        });

        if (result.success) {
            inventoryService.invalidateCache();
        }

        return result;
    }

    async listAllTransactions(filters?: {
        workshop?: WorkshopCode;
        type?: TransactionType;
        materialId?: string;
    }): Promise<Transaction[]> {
        const transactions = await transactionRepository.fetchAll();
        let filtered = Array.isArray(transactions) ? transactions : [];

        if (filters) {
            if (filters.workshop) {
                filtered = filtered.filter(t => t.workshop === filters.workshop);
            }
            if (filters.type) {
                filtered = filtered.filter(t => t.type === filters.type);
            }
            if (filters.materialId) {
                filtered = filtered.filter(t => t.materialId === filters.materialId);
            }
        }
        return filtered;
    }

    async listTransactions(filters: {
        workshop?: WorkshopCode;
        type?: TransactionType;
        materialId?: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<Transaction[]> {
        const transactions = await transactionRepository.list(filters);
        return Array.isArray(transactions) ? transactions : [];
    }
}

export const transactionService = new TransactionService();
