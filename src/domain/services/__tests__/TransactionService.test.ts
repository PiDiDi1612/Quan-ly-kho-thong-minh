import { describe, it, expect, beforeEach, vi } from 'vitest';
import { transactionService } from '../TransactionService';
import { TransactionType, WorkshopCode } from '@/types';
import { inventoryService } from '../InventoryService';
import { transactionRepository } from '@/repositories';

// Mock các dependencies
vi.mock('@/repositories', () => ({
    transactionRepository: {
        create: vi.fn().mockImplementation((tx: any) => Promise.resolve(tx)),
        list: vi.fn().mockResolvedValue([]),
        fetchAll: vi.fn().mockResolvedValue([]),
        fetchById: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockImplementation((_id: any, tx: any) => Promise.resolve(tx)),
        delete: vi.fn().mockResolvedValue(undefined),
        commit: vi.fn().mockResolvedValue({ success: true }),
    }
}));

vi.mock('../InventoryService', () => ({
    inventoryService: {
        validateStockAvailability: vi.fn(),
        loadTransactions: vi.fn().mockResolvedValue(undefined),
        invalidateCache: vi.fn(),
        calculateStock: vi.fn().mockReturnValue(100),
    }
}));

describe('TransactionService', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // =============================================
    // NHẬP KHO (Inbound)
    // =============================================
    describe('Nhập kho (createInboundReceipt)', () => {
        it('Tạo phiếu nhập kho thành công', async () => {
            const data = {
                materialId: 'VT/OG/00001',
                quantity: 100,
                workshop: 'OG' as WorkshopCode,
                supplier: 'NCC001',
                orderCode: 'DH-001',
                note: 'Nhập kho test'
            };

            const result = await transactionService.createInboundReceipt(data);
            expect(result).toBeDefined();
            expect(result.type).toBe(TransactionType.IN);
            expect(result.quantity).toBe(100);
            expect(inventoryService.invalidateCache).toHaveBeenCalled();
        });

        it('Ném lỗi nếu materialId rỗng', async () => {
            const data = {
                materialId: '',
                quantity: 100,
                workshop: 'OG' as WorkshopCode,
                supplier: 'NCC001',
            };
            await expect(transactionService.createInboundReceipt(data)).rejects.toThrow(/Invalid material or quantity/);
        });

        it('Ném lỗi nếu số lượng <= 0', async () => {
            const data = {
                materialId: 'VT/OG/00001',
                quantity: 0,
                workshop: 'OG' as WorkshopCode,
                supplier: 'NCC001',
            };
            await expect(transactionService.createInboundReceipt(data)).rejects.toThrow(/Invalid material or quantity/);
        });

        it('Ném lỗi nếu số lượng âm', async () => {
            const data = {
                materialId: 'VT/OG/00001',
                quantity: -5,
                workshop: 'OG' as WorkshopCode,
                supplier: 'NCC001',
            };
            await expect(transactionService.createInboundReceipt(data)).rejects.toThrow(/Invalid material or quantity/);
        });
    });

    // =============================================
    // XUẤT KHO (Outbound)
    // =============================================
    describe('Xuất kho (createOutboundReceipt)', () => {
        it('Tạo phiếu xuất kho thành công khi đủ tồn kho', async () => {
            vi.mocked(inventoryService.validateStockAvailability).mockImplementation(() => { });

            const data = {
                materialId: 'VT/OG/00001',
                quantity: 50,
                workshop: 'OG' as WorkshopCode,
                orderCode: 'DH-002',
            };

            const result = await transactionService.createOutboundReceipt(data);
            expect(result.type).toBe(TransactionType.OUT);
            expect(result.quantity).toBe(50);
        });

        it('Ném lỗi khi không đủ tồn kho cho xuất', async () => {
            vi.mocked(inventoryService.validateStockAvailability).mockImplementationOnce(() => {
                throw new Error('Insufficient stock');
            });

            const data = {
                materialId: 'VT/OG/00001',
                quantity: 9999,
                workshop: 'OG' as WorkshopCode,
            };

            await expect(transactionService.createOutboundReceipt(data)).rejects.toThrow(/Insufficient stock/);
        });

        it('Ném lỗi khi materialId rỗng cho xuất kho', async () => {
            await expect(
                transactionService.createOutboundReceipt({
                    materialId: '',
                    quantity: 10,
                    workshop: 'OG' as WorkshopCode,
                })
            ).rejects.toThrow(/Invalid material or quantity/);
        });
    });

    // =============================================
    // ĐIỀU CHUYỂN KHO (Transfer)
    // =============================================
    describe('Điều chuyển kho (createTransferReceipt)', () => {
        it('Điều chuyển thành công giữa 2 xưởng khác nhau', async () => {
            vi.mocked(inventoryService.validateStockAvailability).mockImplementation(() => { });

            const data = {
                materialId: 'VT/OG/00001',
                quantity: 20,
                fromWorkshop: 'OG' as WorkshopCode,
                toWorkshop: 'CT' as WorkshopCode,
                note: 'Chuyển test',
            };

            const [outTx, inTx] = await transactionService.createTransferReceipt(data);
            expect(outTx.type).toBe(TransactionType.TRANSFER);
            expect(inTx.type).toBe(TransactionType.TRANSFER);
            expect(outTx.workshop).toBe('OG');
            expect(inTx.workshop).toBe('CT');
        });

        it('Ném lỗi khi điều chuyển cùng xưởng', async () => {
            const data = {
                materialId: 'VT/OG/00001',
                quantity: 10,
                fromWorkshop: 'OG' as WorkshopCode,
                toWorkshop: 'OG' as WorkshopCode,
            };
            await expect(transactionService.createTransferReceipt(data)).rejects.toThrow(/Cannot transfer to the same workshop/);
        });

        it('Ném lỗi khi không đủ tồn kho để điều chuyển', async () => {
            vi.mocked(inventoryService.validateStockAvailability).mockImplementationOnce(() => {
                throw new Error('Insufficient stock');
            });

            const data = {
                materialId: 'VT/OG/00001',
                quantity: 9999,
                fromWorkshop: 'OG' as WorkshopCode,
                toWorkshop: 'CT' as WorkshopCode,
            };

            await expect(transactionService.createTransferReceipt(data)).rejects.toThrow(/Insufficient stock/);
        });

        it('Ném lỗi khi materialId rỗng cho điều chuyển', async () => {
            await expect(
                transactionService.createTransferReceipt({
                    materialId: '',
                    quantity: 10,
                    fromWorkshop: 'OG' as WorkshopCode,
                    toWorkshop: 'CT' as WorkshopCode,
                })
            ).rejects.toThrow(/Invalid material or quantity/);
        });
    });

    // =============================================
    // SINH MÃ PHIẾU (Generate Receipt ID)
    // =============================================
    describe('Sinh mã phiếu (generateReceiptId)', () => {
        it('Sinh mã phiếu nhập PNK/OG/xx/00001', async () => {
            const id = await transactionService.generateReceiptId(TransactionType.IN, 'OG' as WorkshopCode);
            expect(id).toMatch(/^PNK\/OG\/\d{2}\/\d{5}$/);
        });

        it('Sinh mã phiếu xuất PXK/OG/xx/00001', async () => {
            const id = await transactionService.generateReceiptId(TransactionType.OUT, 'OG' as WorkshopCode);
            expect(id).toMatch(/^PXK\/OG\/\d{2}\/\d{5}$/);
        });

        it('Sinh mã phiếu điều chuyển PCK/OG/xx/00001', async () => {
            const id = await transactionService.generateReceiptId(TransactionType.TRANSFER, 'OG' as WorkshopCode);
            expect(id).toMatch(/^PCK\/OG\/\d{2}\/\d{5}$/);
        });

        it('Sinh mã kế tiếp khi đã có giao dịch trước đó', async () => {
            const year = new Date().getFullYear().toString().slice(-2);
            vi.mocked(transactionRepository.list).mockResolvedValueOnce([
                { receiptId: `PNK/OG/${year}/00003` } as any,
                { receiptId: `PNK/OG/${year}/00001` } as any,
            ]);

            const id = await transactionService.generateReceiptId(TransactionType.IN, 'OG' as WorkshopCode);
            expect(id).toBe(`PNK/OG/${year}/00004`);
        });
    });

    // =============================================
    // CẬP NHẬT SỐ LƯỢNG GIAO DỊCH (Update Transaction Quantity)
    // =============================================
    describe('Cập nhật số lượng GD (updateTransactionQuantity)', () => {
        it('Ném lỗi nếu số lượng mới <= 0', async () => {
            await expect(
                transactionService.updateTransactionQuantity('TX001', 0)
            ).rejects.toThrow(/Invalid quantity/);
        });

        it('Ném lỗi nếu giao dịch không tồn tại', async () => {
            vi.mocked(transactionRepository.fetchById).mockResolvedValueOnce(null);
            await expect(
                transactionService.updateTransactionQuantity('TX-NOT-EXIST', 50)
            ).rejects.toThrow(/Transaction not found/);
        });

        it('Cập nhật thành công khi điều kiện hợp lệ (phiếu nhập)', async () => {
            vi.mocked(transactionRepository.fetchById).mockResolvedValueOnce({
                id: 'TX001', type: TransactionType.IN, materialId: 'MAT001',
                workshop: 'OG', quantity: 50,
            } as any);

            const result = await transactionService.updateTransactionQuantity('TX001', 80);
            expect(result.quantity).toBe(80);
            expect(inventoryService.invalidateCache).toHaveBeenCalled();
        });
    });

    // =============================================
    // NHẬP HÀNG LOẠT (Batch Receipt)
    // =============================================
    describe('Nhập hàng loạt (createBatchReceipt)', () => {
        it('Tạo batch nhập kho thành công', async () => {
            const data = {
                receiptId: 'PNK/OG/26/00001',
                receiptType: TransactionType.IN,
                receiptWorkshop: 'OG' as WorkshopCode,
                receiptTime: new Date().toISOString(),
                user: 'admin',
                items: [
                    { materialId: 'MAT001', quantity: 100 },
                    { materialId: 'MAT002', quantity: 200 },
                ],
            };

            const result = await transactionService.createBatchReceipt(data);
            expect(result.success).toBe(true);
        });

        it('Validate tồn kho trước khi batch xuất kho', async () => {
            vi.mocked(inventoryService.validateStockAvailability).mockImplementation(() => { });

            const data = {
                receiptId: 'PXK/OG/26/00001',
                receiptType: TransactionType.OUT,
                receiptWorkshop: 'OG' as WorkshopCode,
                receiptTime: new Date().toISOString(),
                user: 'admin',
                items: [{ materialId: 'MAT001', quantity: 50 }],
            };

            await transactionService.createBatchReceipt(data);
            expect(inventoryService.validateStockAvailability).toHaveBeenCalled();
        });
    });

    // =============================================
    // ĐIỀU CHUYỂN HÀNG LOẠT (Batch Transfer)
    // =============================================
    describe('Điều chuyển hàng loạt (createBatchTransfer)', () => {
        it('Tạo batch điều chuyển thành công', async () => {
            vi.mocked(inventoryService.validateStockAvailability).mockImplementation(() => { });

            const data = {
                receiptId: 'PCK/OG/26/00001',
                fromWorkshop: 'OG' as WorkshopCode,
                toWorkshop: 'CT' as WorkshopCode,
                user: 'admin',
                items: [
                    { materialId: 'MAT001', quantity: 30 },
                ],
            };

            const result = await transactionService.createBatchTransfer(data);
            expect(result.success).toBe(true);
            expect(inventoryService.validateStockAvailability).toHaveBeenCalled();
        });
    });

    // =============================================
    // TÌM KIẾM / LỌC GIAO DỊCH (Filter Transactions)
    // =============================================
    describe('Tìm kiếm Giao dịch (listAllTransactions)', () => {
        it('Lọc giao dịch theo xưởng', async () => {
            vi.mocked(transactionRepository.fetchAll).mockResolvedValueOnce([
                { id: '1', workshop: 'OG', type: 'IN', materialId: 'M1' } as any,
                { id: '2', workshop: 'CT', type: 'IN', materialId: 'M2' } as any,
                { id: '3', workshop: 'OG', type: 'OUT', materialId: 'M3' } as any,
            ]);

            const result = await transactionService.listAllTransactions({ workshop: 'OG' as WorkshopCode });
            expect(result).toHaveLength(2);
            expect(result.every(t => t.workshop === 'OG')).toBe(true);
        });

        it('Lọc giao dịch theo loại (IN, OUT, TRANSFER)', async () => {
            vi.mocked(transactionRepository.fetchAll).mockResolvedValueOnce([
                { id: '1', workshop: 'OG', type: 'IN', materialId: 'M1' } as any,
                { id: '2', workshop: 'OG', type: 'OUT', materialId: 'M2' } as any,
            ]);

            const result = await transactionService.listAllTransactions({ type: TransactionType.OUT });
            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('OUT');
        });

        it('Lọc giao dịch theo mã vật tư', async () => {
            vi.mocked(transactionRepository.fetchAll).mockResolvedValueOnce([
                { id: '1', workshop: 'OG', type: 'IN', materialId: 'MAT001' } as any,
                { id: '2', workshop: 'OG', type: 'IN', materialId: 'MAT002' } as any,
            ]);

            const result = await transactionService.listAllTransactions({ materialId: 'MAT001' });
            expect(result).toHaveLength(1);
            expect(result[0].materialId).toBe('MAT001');
        });

        it('Trả về toàn bộ khi không có filter', async () => {
            vi.mocked(transactionRepository.fetchAll).mockResolvedValueOnce([
                { id: '1' } as any,
                { id: '2' } as any,
            ]);

            const result = await transactionService.listAllTransactions();
            expect(result).toHaveLength(2);
        });
    });

    // =============================================
    // XÓA GIAO DỊCH (Delete Transaction)
    // =============================================
    describe('Xóa giao dịch (deleteTransaction)', () => {
        it('Xóa giao dịch và invalidate cache', async () => {
            await transactionService.deleteTransaction('TX001', 'admin');
            expect(transactionRepository.delete).toHaveBeenCalledWith('TX001');
            expect(inventoryService.invalidateCache).toHaveBeenCalled();
        });
    });
});
