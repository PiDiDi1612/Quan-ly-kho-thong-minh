import { ActivityLog, TransactionType, WorkshopCode } from '@/types';

export interface InventoryReport {
    workshop?: WorkshopCode;
    asOfDate: Date;
    materials: Array<{
        id: string;
        name: string;
        unit: string;
        quantity: number;
        minThreshold: number;
        status: 'ok' | 'low' | 'critical';
    }>;
    summary: {
        totalMaterials: number;
        totalValue?: number;
        lowStockCount: number;
    };
}

export interface TransactionReport {
    workshop?: WorkshopCode;
    type?: TransactionType;
    startDate: Date;
    endDate: Date;
    transactions: Array<{
        id: string;
        receiptId: string;
        materialName: string;
        type: TransactionType;
        quantity: number;
        date: string;
        user: string;
    }>;
    summary: {
        totalIn: number;
        totalOut: number;
        totalTransfer: number;
        netChange: number;
    };
}

export interface IReportService {
    /**
     * Generate inventory report
     */
    generateInventoryReport(filters: {
        workshop?: WorkshopCode;
        asOfDate?: Date;
    }): Promise<InventoryReport>;

    /**
     * Generate transaction report
     */
    generateTransactionReport(filters: {
        workshop?: WorkshopCode;
        type?: TransactionType;
        startDate: Date;
        endDate: Date;
    }): Promise<TransactionReport>;

    /**
     * Export data to Excel
     */
    exportToExcel(
        type: 'inventory' | 'transactions' | 'activity',
        filters: any
    ): Promise<Blob>;

    /**
     * Get activity logs
     */
    getActivityLogs(filters: {
        userId?: string;
        entityType?: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<ActivityLog[]>;
}
