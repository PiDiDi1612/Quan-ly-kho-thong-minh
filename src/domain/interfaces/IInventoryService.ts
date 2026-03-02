import { Material, Transaction, WorkshopCode } from '@/types';

export interface IInventoryService {
    /**
     * Calculate current stock for a material
     * Single source of truth for inventory calculations
     */
    calculateStock(materialId: string, workshop: WorkshopCode): number;

    /**
     * Calculate stock for all materials (for dashboard)
     * @returns Map of materialId to quantity
     */
    calculateAllStocks(workshop?: WorkshopCode): Map<string, number>;

    /**
     * Validate if there's enough stock for withdrawal
     * @throws Error if insufficient stock
     */
    validateStockAvailability(
        materialId: string,
        workshop: WorkshopCode,
        requestedQty: number
    ): void;

    /**
     * Get materials below minimum threshold
     */
    getLowStockMaterials(workshop?: WorkshopCode): Material[];

    /**
     * Update minimum threshold for a material
     */
    updateMinThreshold(materialId: string, newThreshold: number): Promise<void>;

    /**
     * Get stock history for a material
     */
    getStockHistory(
        materialId: string,
        startDate?: Date,
        endDate?: Date
    ): Transaction[];

    /**
     * Clear cache (for testing or manual refresh)
     */
    clearCache(): void;
}
