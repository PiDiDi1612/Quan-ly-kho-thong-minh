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

        // Get receipt prefix based on type
        const prefix = BUSINESS_CONSTANTS.RECEIPT_PREFIXES[type];
        const yearPrefix = `${prefix}/${workshop}/${year}/`;

        // Get all transactions of same type & workshop
        let allTxs = await transactionRepository.list({
            type,
            workshop
        });
        if (!Array.isArray(allTxs)) allTxs = [];

        // Filter by year prefix and find max number
        const samePeriod = allTxs.filter(t => t.receiptId.startsWith(yearPrefix));

        let maxNum = 0;
        for (const tx of samePeriod) {
            const parts = tx.receiptId.split('/');
            const num = parseInt(parts[3], 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }

        // Generate next number with padding
        const nextNum = maxNum + 1;
        const paddedNum = nextNum.toString().padStart(5, '0');

        return `${prefix}/${workshop}/${year}/${paddedNum}`;
    }

    /**
     * Create inbound receipt (nhập kho)
     */
    async createInboundReceipt(data: CreateReceiptData): Promise<Transaction> {
        // 1. Validation
        if (!data.materialId || data.quantity <= 0) {
            throw new Error('Invalid material or quantity');
        }

        // Note: No max validation for now, can add later if needed

        // 2. Generate receipt ID
        const receiptId = await this.generateReceiptId(
            TransactionType.IN,
            data.workshop
        );

        // 3. Create transaction object
        const newTx: Partial<Transaction> = {
            id: crypto.randomUUID(),
            receiptId,
            type: TransactionType.IN,
            materialId: data.materialId,
            materialName: '', // Will be set by API or caller
            workshop: data.workshop,
            quantity: data.quantity,
            date: new Date().toISOString(), // Full timestamp
            user: '', // Will be set by API
            supplier: data.supplier,
            orderCode: data.orderCode,
            note: data.note,
        };

        // 4. Save to database
        const created = await transactionRepository.create(newTx as Transaction);

        // 5. Invalidate inventory cache
        inventoryService.invalidateCache();

        return created;
    }

    /**
     * Create outbound receipt (xuất kho)
     * Validates stock availability before creating
     */
    async createOutboundReceipt(
        data: Omit<CreateReceiptData, 'supplier'>
    ): Promise<Transaction> {
        // 1. Validation
        if (!data.materialId || data.quantity <= 0) {
            throw new Error('Invalid material or quantity');
        }

        // Refresh inventory to ensure accurate stock check
        await inventoryService.loadTransactions();

        // 2. **STRICT STOCK VALIDATION**
        // This will throw error if insufficient stock
        inventoryService.validateStockAvailability(
            data.materialId,
            data.workshop,
            data.quantity
        );

        // 3. Generate receipt ID
        const receiptId = await this.generateReceiptId(
            TransactionType.OUT,
            data.workshop
        );

        // 4. Create transaction
        const newTx: Partial<Transaction> = {
            id: crypto.randomUUID(),
            receiptId,
            type: TransactionType.OUT,
            materialId: data.materialId,
            materialName: '', // Will be set by API or caller
            workshop: data.workshop,
            quantity: data.quantity,
            date: new Date().toISOString(), // Full timestamp
            user: '', // Will be set by API
            orderCode: data.orderCode,
            note: data.note,
        };

        // 5. Save to database
        const created = await transactionRepository.create(newTx as Transaction);

        // 6. Invalidate cache
        inventoryService.invalidateCache();

        return created;
    }

    /**
     * Create transfer receipt (điều chuyển)
     * Returns [OUT transaction, IN transaction]
     * Includes rollback mechanism if IN creation fails
     */
    async createTransferReceipt(
        data: CreateTransferData
    ): Promise<[Transaction, Transaction]> {
        // 1. Validation
        if (data.fromWorkshop === data.toWorkshop) {
            throw new Error('Cannot transfer to the same workshop');
        }

        if (!data.materialId || data.quantity <= 0) {
            throw new Error('Invalid material or quantity');
        }

        // Refresh inventory before validation
        await inventoryService.loadTransactions();

        // 2. **VALIDATE SOURCE STOCK**
        inventoryService.validateStockAvailability(
            data.materialId,
            data.fromWorkshop,
            data.quantity
        );

        // 3. Generate receipt ID for transfer
        const receiptId = await this.generateReceiptId(
            TransactionType.TRANSFER,
            data.fromWorkshop
        );

        // 4. Create OUT transaction (from source)
        const outTx: Partial<Transaction> = {
            id: crypto.randomUUID(),
            receiptId,
            type: TransactionType.TRANSFER,
            materialId: data.materialId,
            materialName: '', // Will be set by API or caller
            workshop: data.fromWorkshop,  // SOURCE workshop
            quantity: data.quantity,
            date: new Date().toISOString(), // Full timestamp
            user: '', // Will be set by API
            note: data.note || `Điều chuyển → ${data.toWorkshop}`,
        };

        let createdOut: Transaction;
        let createdIn: Transaction | null = null;

        try {
            // 5. Save OUT transaction
            createdOut = await transactionRepository.create(outTx as Transaction);

            // 6. Create IN transaction (to destination)
            // Link to OUT transaction via receiptId
            const inTx: Partial<Transaction> = {
                ...outTx,
                id: crypto.randomUUID(),
                receiptId: receiptId + '-IN', // Suffix to link
                workshop: data.toWorkshop,    // DESTINATION workshop
                note: data.note || `Điều chuyển ← ${data.fromWorkshop}`,
            };

            createdIn = await transactionRepository.create(inTx as Transaction);

            // 7. Success - invalidate cache
            inventoryService.invalidateCache();

            return [createdOut, createdIn];

        } catch (error: any) {
            // 8. **ROLLBACK MECHANISM**
            // If IN creation failed but OUT succeeded, delete OUT
            if (createdOut && !createdIn) {
                console.error('Transfer IN creation failed, attempting rollback...');

                try {
                    await transactionRepository.delete(createdOut.id);
                    console.log('Successfully rolled back OUT transaction:', createdOut.id);
                } catch (rollbackError: any) {
                    // CRITICAL: Rollback failed - manual intervention needed
                    console.error('CRITICAL: Rollback failed!', {
                        outTransactionId: createdOut.id,
                        receiptId: createdOut.receiptId,
                        error: rollbackError.message
                    });

                    // TODO: Log to admin panel or alert system
                    // This requires manual database cleanup
                }
            }

            throw new Error(`Transfer failed: ${error.message}`);
        }
    }

    /**
     * Delete transaction
     * TODO: Add permission check in future
     */
    async deleteTransaction(transactionId: string, userId: string): Promise<void> {
        await transactionRepository.delete(transactionId);
        inventoryService.invalidateCache();
    }

    /**
     * Update transaction quantity
     * TODO: Add stock revalidation
     */
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

        // 1. **STOCK REVALIDATION**
        // If it's an OUT transaction or TRANSFER (source), we need to check if we have enough stock
        // when changing from old quantity to new quantity.
        if (tx.type === TransactionType.OUT || tx.type === TransactionType.TRANSFER) {
            // "Return" the old quantity to inventory temporarily to check if we can afford the new one
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

    /**
     * Create batch receipt (nhập/xuất hàng loạt)
     */
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
        // 1. Refresh inventory for accurate validation
        await inventoryService.loadTransactions();

        // 2. Validate stock for OUT transactions
        if (data.receiptType === TransactionType.OUT) {
            for (const item of data.items) {
                inventoryService.validateStockAvailability(
                    item.materialId,
                    data.receiptWorkshop,
                    item.quantity
                );
            }
        }

        // 3. Delegate to repository
        const result = await transactionRepository.commit({
            mode: 'RECEIPT',
            payload: data
        });

        // 4. If success, invalidate cache
        if (result.success) {
            inventoryService.invalidateCache();
        }

        return result;
    }

    /**
     * Create batch transfer (điều chuyển hàng loạt)
     */
    async createBatchTransfer(data: {
        receiptId: string;
        fromWorkshop: WorkshopCode;
        toWorkshop: WorkshopCode;
        orderCode?: string;
        user: string;
        items: { materialId: string; quantity: number }[];
    }): Promise<{ success: boolean; error?: string }> {
        // 1. Refresh inventory
        await inventoryService.loadTransactions();

        // 2. Validate stock from source workshop
        for (const item of data.items) {
            inventoryService.validateStockAvailability(
                item.materialId,
                data.fromWorkshop,
                item.quantity
            );
        }

        // 3. Delegate to repository
        const result = await transactionRepository.commit({
            mode: 'TRANSFER',
            payload: data
        });

        // 4. Invalidate cache
        if (result.success) {
            inventoryService.invalidateCache();
        }

        return result;
    }

    /**
     * List transactions with filters
     */
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

// Export singleton instance
export const transactionService = new TransactionService();
