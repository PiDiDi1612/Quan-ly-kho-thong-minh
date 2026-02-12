import { Material, Transaction, WorkshopCode } from '@/types';
import { IInventoryService } from '@/domain/interfaces/IInventoryService';
import { transactionRepository } from '@/repositories';
import { VALIDATION_RULES } from '@/domain/constants';

interface StockCacheEntry {
    quantity: number;
    timestamp: number;
}

/**
 * Inventory Service - Single source of truth for stock calculations
 * Implements caching with 30s TTL and strict validation
 */
export class InventoryService implements IInventoryService {
    private stockCache: Map<string, StockCacheEntry> = new Map();
    private allTransactions: Transaction[] | null = null;
    private transactionsByMaterial: Map<string, Transaction[]> = new Map();
    private lastFetchTime: number = 0;

    /**
     * Calculate current stock for a material
     * Single source of truth for inventory calculations
     */
    calculateStock(materialId: string, workshop: WorkshopCode): number {
        const cacheKey = `${materialId}:${workshop}`;

        // Check cache first
        const cached = this.stockCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < VALIDATION_RULES.CACHE_TTL_MS) {
            return cached.quantity;
        }

        // Optimize: Use indexed transactions if available
        let relevantTransactions: Transaction[] = [];

        if (this.transactionsByMaterial.has(materialId)) {
            relevantTransactions = this.transactionsByMaterial.get(materialId) || [];
        } else if (this.allTransactions && this.allTransactions.length > 0) {
            // Fallback to filtering raw list (but only once per material load ideally)
            relevantTransactions = this.allTransactions.filter(tx => tx.materialId === materialId);
            // Cache for next time
            this.transactionsByMaterial.set(materialId, relevantTransactions);
        } else {
            // No transactions or not loaded
            if (cached) return cached.quantity;
            return 0;
        }

        let stock = 0;

        for (const tx of relevantTransactions) {
            switch (tx.type) {
                case 'IN':
                    if (tx.workshop === workshop) {
                        stock += tx.quantity;
                    }
                    break;

                case 'OUT':
                    if (tx.workshop === workshop) {
                        stock -= tx.quantity;
                    }
                    break;

                case 'TRANSFER':
                    if (tx.workshop === workshop) {
                        stock -= tx.quantity;
                    } else if (tx.targetWorkshop === workshop && tx.targetMaterialId === materialId) {
                        stock += tx.quantity;
                    }
                    break;
            }
        }

        this.stockCache.set(cacheKey, {
            quantity: stock,
            timestamp: Date.now(),
        });

        return stock;
    }

    /**
     * Calculate stock for all materials (for dashboard)
     * @returns Map of materialId:workshop to quantity
     */
    calculateAllStocks(workshop?: WorkshopCode): Map<string, number> {
        const transactions = this.getTransactionsSync();
        const stockMap = new Map<string, number>();

        for (const tx of transactions) {
            // Filter by workshop if specified
            // For IN/OUT, must match workshop
            // For TRANSFER, must match EITHER source OR destination
            if (workshop) {
                const isRelevant =
                    tx.workshop === workshop ||
                    (tx.type === 'TRANSFER' && tx.targetWorkshop === workshop);
                if (!isRelevant) continue;
            }

            // Helper to update stock for a specific key
            const updateStock = (key: string, change: number) => {
                const current = stockMap.get(key) || 0;
                stockMap.set(key, current + change);
            };

            switch (tx.type) {
                case 'IN':
                    if (!workshop || tx.workshop === workshop) {
                        const key = workshop ? tx.materialId : `${tx.materialId}:${tx.workshop}`;
                        updateStock(key, tx.quantity);
                    }
                    break;

                case 'OUT':
                    if (!workshop || tx.workshop === workshop) {
                        const key = workshop ? tx.materialId : `${tx.materialId}:${tx.workshop}`;
                        updateStock(key, -tx.quantity);
                    }
                    break;

                case 'TRANSFER':
                    // Handle Source (Outgoing)
                    if (!workshop || tx.workshop === workshop) {
                        const srcKey = workshop ? tx.materialId : `${tx.materialId}:${tx.workshop}`;
                        updateStock(srcKey, -tx.quantity);
                    }

                    // Handle Destination (Incoming)
                    if (tx.targetWorkshop && tx.targetMaterialId) {
                        if (!workshop || tx.targetWorkshop === workshop) {
                            const destKey = workshop
                                ? tx.targetMaterialId
                                : `${tx.targetMaterialId}:${tx.targetWorkshop}`;
                            updateStock(destKey, tx.quantity);
                        }
                    }
                    break;
            }
        }

        return stockMap;
    }

    /**
     * Validate if there's enough stock for withdrawal
     * @throws Error if insufficient stock
     */
    validateStockAvailability(
        materialId: string,
        workshop: WorkshopCode,
        requestedQty: number
    ): void {
        const currentStock = this.calculateStock(materialId, workshop);

        if (currentStock < requestedQty) {
            throw new Error(
                `Insufficient stock: Available=${currentStock}, Requested=${requestedQty}`
            );
        }

        // Additional validation: prevent negative stock
        if (currentStock - requestedQty < 0) {
            throw new Error('Operation would result in negative stock');
        }
    }

    /**
     * Get materials below minimum threshold
     */
    getLowStockMaterials(workshop?: WorkshopCode): Material[] {
        // This requires materials data which we don't have in this service
        // This should be moved to a higher-level service or kept in UI layer
        // For now, return empty array
        // TODO: Inject MaterialRepository to fetch materials
        return [];
    }

    /**
     * Update minimum threshold for a material
     */
    async updateMinThreshold(materialId: string, newThreshold: number): Promise<void> {
        // This should delegate to MaterialRepository
        // TODO: Inject MaterialRepository
        throw new Error('Not implemented - should use MaterialService');
    }

    /**
     * Get stock history for a material
     */
    getStockHistory(
        materialId: string,
        startDate?: Date,
        endDate?: Date
    ): Transaction[] {
        const transactions = this.getTransactionsSync();

        return transactions.filter((tx) => {
            if (tx.materialId !== materialId) return false;

            if (startDate || endDate) {
                const txDate = new Date(tx.date);
                if (startDate && txDate < startDate) return false;
                if (endDate && txDate > endDate) return false;
            }

            return true;
        });
    }

    /**
     * Clear cache (for testing or manual refresh)
     */
    clearCache(): void {
        this.stockCache.clear();
        this.allTransactions = null;
        this.lastFetchTime = 0;
    }

    /**
     * Invalidate cache on transaction changes
     * Call this after creating/updating/deleting transactions
     */
    invalidateCache(): void {
        this.clearCache();
    }

    /**
     * Get all transactions (with caching)
     * This is a synchronous wrapper for now
     */
    private getTransactionsSync(): Transaction[] {
        const result = this.allTransactions || [];
        console.log(`[InventoryService] getTransactionsSync: returning ${result.length} transactions, allTransactions is ${this.allTransactions ? 'loaded' : 'null'}`);
        return result;
    }

    /**
     * Load transactions from repository
     * Call this once on app startup or when needed
     */
    async loadTransactions(): Promise<void> {
        console.log('[InventoryService] loadTransactions: fetching from repository...');
        this.allTransactions = await transactionRepository.fetchAll();
        this.transactionsByMaterial.clear(); // Clear index on fresh load

        // Rebuild index
        if (this.allTransactions) {
            for (const tx of this.allTransactions) {
                if (!this.transactionsByMaterial.has(tx.materialId)) {
                    this.transactionsByMaterial.set(tx.materialId, []);
                }
                this.transactionsByMaterial.get(tx.materialId)!.push(tx);

                // For transfers, also index by target material
                if (tx.type === 'TRANSFER' && tx.targetMaterialId) {
                    if (!this.transactionsByMaterial.has(tx.targetMaterialId)) {
                        this.transactionsByMaterial.set(tx.targetMaterialId, []);
                    }
                    this.transactionsByMaterial.get(tx.targetMaterialId)!.push(tx);
                }
            }
        }

        this.lastFetchTime = Date.now();
    }
}

// Export singleton instance
export const inventoryService = new InventoryService();
