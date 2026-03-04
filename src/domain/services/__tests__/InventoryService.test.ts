import { describe, it, expect, beforeEach } from 'vitest';
import { InventoryService } from '../InventoryService';
import { Transaction, WorkshopCode, TransactionType } from '@/types';

describe('InventoryService', () => {
    let service: InventoryService;

    const mockTransactions: Transaction[] = [
        { id: '1', receiptId: 'PNK/OG/24/00001', type: TransactionType.IN, materialId: 'MAT001', materialName: 'Test Material 1', workshop: 'OG' as WorkshopCode, quantity: 100, date: '2024-01-01', user: 'admin', orderCode: 'ORD01' },
        { id: '2', receiptId: 'PXK/OG/24/00001', type: TransactionType.OUT, materialId: 'MAT001', materialName: 'Test Material 1', workshop: 'OG' as WorkshopCode, quantity: 30, date: '2024-01-02', user: 'admin', orderCode: 'ORD02' },
        { id: '3', receiptId: 'PNK/OG/24/00002', type: TransactionType.IN, materialId: 'MAT001', materialName: 'Test Material 1', workshop: 'OG' as WorkshopCode, quantity: 50, date: '2024-01-03', user: 'admin', orderCode: 'ORD03' },
    ];

    beforeEach(() => {
        service = new InventoryService();
        // Manually inject mock transactions for testing
        (service as any).allTransactions = mockTransactions;
    });

    it('Tính toán tồn kho đúng cách (Calculate stock)', () => {
        const stock = service.calculateStock('MAT001', 'OG' as WorkshopCode);
        expect(stock).toBe(120); // 100 - 30 + 50
    });

    it('Sử dụng giá trị cache cho lần gọi tiếp theo (Cache works)', () => {
        const stock1 = service.calculateStock('MAT001', 'OG' as WorkshopCode);
        const startTime = Date.now();
        const stock2 = service.calculateStock('MAT001', 'OG' as WorkshopCode);
        const endTime = Date.now();

        expect(stock1).toBe(120);
        expect(stock2).toBe(120);
        expect(endTime - startTime).toBeLessThan(10); // execute extremely fast
    });

    it('Kiểm tra định dạng tồn kho hợp lệ - Đủ tồn kho', () => {
        expect(() => {
            service.validateStockAvailability('MAT001', 'OG' as WorkshopCode, 50);
        }).not.toThrow();
    });

    it('Kiểm tra định dạng tồn kho hợp lệ - Không đủ tồn kho', () => {
        expect(() => {
            service.validateStockAvailability('MAT001', 'OG' as WorkshopCode, 200);
        }).toThrow(/Insufficient stock/i);
    });

    it('Xóa bộ nhớ đệm thành công (Clear cache)', () => {
        service.calculateStock('MAT001', 'OG' as WorkshopCode); // cache filled
        service.clearCache();

        // Cache cleared, stock should still be recalculated to 120
        const stock = service.calculateStock('MAT001', 'OG' as WorkshopCode);
        expect(stock).toBe(120);
    });

    it('Lấy lịch sử giao dịch chính xác (Get stock history)', () => {
        const history = service.getStockHistory('MAT001');
        expect(history.length).toBe(3);
        expect(history[0].id).toBe('1');
    });
});
