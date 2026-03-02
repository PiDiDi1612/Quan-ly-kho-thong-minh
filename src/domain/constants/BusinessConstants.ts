import { TransactionType, WorkshopCode } from '@/types';

/**
 * Receipt ID prefixes by transaction type
 */
export const RECEIPT_PREFIXES: Record<TransactionType, string> = {
    IN: 'PNK',      // Phiếu Nhập Kho
    OUT: 'PXK',     // Phiếu Xuất Kho
    TRANSFER: 'PCK', // Phiếu Chuyển Kho
};

/**
 * Material ID prefix
 */
export const MATERIAL_ID_PREFIX = 'VT';

/**
 * Default values
 */
export const DEFAULTS = {
    MIN_THRESHOLD: 10,
    CACHE_ENABLED: false,
    PAGE_SIZE: 50,
} as const;

/**
 * Transaction delete time limit (days)
 */
export const TRANSACTION_DELETE_LIMIT_DAYS = 7;

/**
 * Merge operation requires admin role
 */
export const MERGE_REQUIRED_ROLE = 'ADMIN' as const;
