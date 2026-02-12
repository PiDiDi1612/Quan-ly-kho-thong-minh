import { TransactionType, WorkshopCode } from '@/types';

/**
 * Validation rules for business logic
 */
export const VALIDATION_RULES = {
    /** Minimum quantity for any transaction */
    MIN_QUANTITY: 0.01,

    /** Maximum quantity for safety (prevent typos) */
    MAX_QUANTITY: 1000000,

    /** Minimum threshold for low stock warning */
    MIN_THRESHOLD: 1,

    /** Cache TTL in milliseconds (30 seconds) */
    CACHE_TTL_MS: 30000,

    /** Receipt ID max length */
    RECEIPT_ID_MAX_LENGTH: 50,

    /** Material name max length */
    MATERIAL_NAME_MAX_LENGTH: 200,
} as const;

/**
 * Regular expressions for validation
 */
export const VALIDATION_REGEX = {
    /** Receipt ID format: PNK/OG/24/00001 */
    RECEIPT_ID: /^P[NXC]K\/[A-Z]{2}\/\d{2}\/\d{5}$/,

    /** Material ID format: VT/OG/00001 (optional) */
    MATERIAL_ID: /^VT\/[A-Z]{2}\/\d{5}$/,
} as const;
