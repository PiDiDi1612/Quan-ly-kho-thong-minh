import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test SupplierService by creating a fresh instance with mock repository
// Import the CLASS directly, not the singleton 
// Need to mock repository module before importing class

vi.mock('@/repositories/SupplierRepository', () => ({
    supplierRepository: {
        list: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        merge: vi.fn().mockResolvedValue({ success: true, message: 'Merged successfully' }),
        import: vi.fn().mockResolvedValue({ imported: 2, updated: 0, total: 2 }),
    }
}));

// Import after mocking
import { supplierService } from '../SupplierService';
import { supplierRepository } from '@/repositories/SupplierRepository';
import { Supplier } from '@/types';

describe('SupplierService', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // =============================================
    // DANH SÁCH NHÀ CUNG CẤP (List)
    // =============================================
    describe('Lấy danh sách NCC (listSuppliers)', () => {
        it('Trả về mảng danh sách NCC', async () => {
            vi.mocked(supplierRepository.list).mockResolvedValueOnce([
                { id: '1', code: 'NCC001', name: 'Công ty A' },
                { id: '2', code: 'NCC002', name: 'Công ty B' },
            ] as any);

            const result = await supplierService.listSuppliers();
            expect(result).toHaveLength(2);
            expect(result[0].code).toBe('NCC001');
        });
    });

    // =============================================
    // THÊM MỚI NCC (Create)
    // =============================================
    describe('Thêm mới NCC (createSupplier)', () => {
        it('Gọi repository create với dữ liệu đúng', async () => {
            const data = { code: 'NCC003', name: 'Công ty C', description: 'Mô tả' };
            await supplierService.createSupplier(data as any);
            expect(supplierRepository.create).toHaveBeenCalledWith(data);
        });
    });

    // =============================================
    // CẬP NHẬT NCC (Update)
    // =============================================
    describe('Cập nhật NCC (updateSupplier)', () => {
        it('Gọi repository update với dữ liệu đúng', async () => {
            const data = { id: '1', name: 'Tên mới' };
            await supplierService.updateSupplier(data as any);
            expect(supplierRepository.update).toHaveBeenCalledWith(data);
        });
    });

    // =============================================
    // XÓA NCC (Delete)
    // =============================================
    describe('Xóa NCC (deleteSupplier)', () => {
        it('Gọi repository delete với id đúng', async () => {
            await supplierService.deleteSupplier('123');
            expect(supplierRepository.delete).toHaveBeenCalledWith('123');
        });
    });

    // =============================================
    // HỢP NHẤT NCC (Merge)
    // =============================================
    describe('Hợp nhất NCC (mergeSuppliers)', () => {
        it('Hợp nhất thành công khi đủ điều kiện', async () => {
            const result = await supplierService.mergeSuppliers(['1', '2'], 'NCC001', 'Tên chính');
            expect(result.success).toBe(true);
            expect(supplierRepository.merge).toHaveBeenCalled();
        });

        it('Ném lỗi nếu chọn ít hơn 2 NCC', async () => {
            await expect(
                supplierService.mergeSuppliers(['1'], 'NCC001', 'Tên chính')
            ).rejects.toThrow(/ít nhất 2 NCC/);
        });

        it('Ném lỗi nếu thiếu mã NCC chính', async () => {
            await expect(
                supplierService.mergeSuppliers(['1', '2'], '', 'Tên chính')
            ).rejects.toThrow(/Thiếu thông tin/);
        });

        it('Ném lỗi nếu thiếu tên NCC chính', async () => {
            await expect(
                supplierService.mergeSuppliers(['1', '2'], 'NCC001', '')
            ).rejects.toThrow(/Thiếu thông tin/);
        });
    });

    // =============================================
    // IMPORT EXCEL NCC
    // =============================================
    describe('Import Excel NCC (importFromExcel)', () => {
        it('Import thành công dữ liệu hợp lệ', async () => {
            const data = [
                { 'Mã NCC': 'NCC010', 'Tên NCC': 'Công ty Test', 'Mô tả': 'Mô tả test' },
                { 'Mã NCC': 'NCC011', 'Tên NCC': 'Công ty Test 2', 'Mô tả': '' },
            ];
            const result = await supplierService.importFromExcel(data);
            expect(result.imported).toBe(2);
            expect(supplierRepository.import).toHaveBeenCalled();
        });

        it('Ném lỗi nếu file Excel không có dữ liệu hợp lệ', async () => {
            const data = [
                { 'Cột A': 'xxx' }, // thiếu "Mã NCC" và "Tên NCC"
            ];
            await expect(supplierService.importFromExcel(data)).rejects.toThrow(/Không tìm thấy dữ liệu hợp lệ/);
        });
    });

    // =============================================
    // SINH MÃ NCC (Generate Supplier Code)
    // =============================================
    describe('Sinh mã NCC (generateSupplierCode)', () => {
        it('Sinh NCC001 khi chưa có NCC nào', () => {
            const code = supplierService.generateSupplierCode([]);
            expect(code).toBe('NCC001');
        });

        it('Sinh mã kế tiếp (NCC004) dựa trên danh sách hiện có', () => {
            const existing = [
                { code: 'NCC001' }, { code: 'NCC003' },
            ] as Supplier[];
            const code = supplierService.generateSupplierCode(existing);
            expect(code).toBe('NCC004');
        });

        it('Bỏ qua mã không bắt đầu bằng "NCC"', () => {
            const existing = [
                { code: 'ABC001' }, { code: 'NCC002' },
            ] as Supplier[];
            const code = supplierService.generateSupplierCode(existing);
            expect(code).toBe('NCC003');
        });
    });
});
