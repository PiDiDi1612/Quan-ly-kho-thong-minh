import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MaterialService } from '../MaterialService';
import { WorkshopCode } from '@/types';

// Mock all external dependencies
vi.mock('@/repositories', () => ({
    materialRepository: {
        fetchAll: vi.fn().mockResolvedValue([]),
        fetchById: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation((m: any) => Promise.resolve(m)),
        update: vi.fn().mockImplementation((_id: any, m: any) => Promise.resolve(m)),
        delete: vi.fn().mockResolvedValue(undefined),
    }
}));

vi.mock('@/services/api', () => ({
    apiService: {
        get: vi.fn().mockResolvedValue([]),
        post: vi.fn().mockResolvedValue({ success: true }),
        delete: vi.fn().mockResolvedValue({ success: true }),
    }
}));

vi.mock('./InventoryService', () => ({
    inventoryService: {
        calculateStock: vi.fn().mockReturnValue(0),
        clearCache: vi.fn(),
        getStockHistory: vi.fn().mockReturnValue([]),
    }
}));

vi.mock('./TransactionService', () => ({
    transactionService: {}
}));

import { materialRepository } from '@/repositories';

describe('MaterialService', () => {
    let service: MaterialService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new MaterialService();
    });

    // =============================================
    // THÊM MỚI VẬT TƯ (Create Material)
    // =============================================
    describe('Thêm mới Vật tư (createMaterial)', () => {
        it('Tạo thành công vật tư mới với đầy đủ thông tin', async () => {
            const data = {
                name: 'Ống thép DN100',
                classification: 'ONG_GIO' as any,
                unit: 'Cái',
                workshop: 'OG' as WorkshopCode,
            };

            const result = await service.createMaterial(data);

            expect(result).toBeDefined();
            expect(result.name).toBe('Ống thép DN100');
            expect(result.workshop).toBe('OG');
            expect(result.quantity).toBe(0);
            expect(materialRepository.create).toHaveBeenCalled();
        });

        it('Ném ra lỗi nếu thiếu tên vật tư', async () => {
            const data = {
                name: '',
                classification: 'ONG_GIO' as any,
                unit: 'Cái',
                workshop: 'OG' as WorkshopCode,
            };

            await expect(service.createMaterial(data)).rejects.toThrow(/Missing required fields/);
        });

        it('Ném ra lỗi nếu thiếu đơn vị tính', async () => {
            const data = {
                name: 'Ống thép DN100',
                classification: 'ONG_GIO' as any,
                unit: '',
                workshop: 'OG' as WorkshopCode,
            };

            await expect(service.createMaterial(data)).rejects.toThrow(/Missing required fields/);
        });

        it('Ném ra lỗi nếu trùng tên vật tư cùng xưởng', async () => {
            vi.mocked(materialRepository.fetchAll).mockResolvedValueOnce([
                { id: 'VT/OG/00001', name: 'Ống thép DN100', classification: 'ONG_GIO', unit: 'Cái', workshop: 'OG', quantity: 10, minThreshold: 5, lastUpdated: '' } as any,
            ]);

            const data = {
                name: 'Ống thép DN100',
                classification: 'ONG_GIO' as any,
                unit: 'Cái',
                workshop: 'OG' as WorkshopCode,
            };

            await expect(service.createMaterial(data)).rejects.toThrow(/already exists/);
        });

        it('Cho phép tạo cùng tên nhưng khác xưởng', async () => {
            vi.mocked(materialRepository.fetchAll).mockResolvedValueOnce([
                { id: 'VT/OG/00001', name: 'Ống thép DN100', classification: 'ONG_GIO', unit: 'Cái', workshop: 'OG', quantity: 10, minThreshold: 5, lastUpdated: '' } as any,
            ]);

            const data = {
                name: 'Ống thép DN100',
                classification: 'ONG_GIO' as any,
                unit: 'Cái',
                workshop: 'CT' as WorkshopCode, // Different workshop
            };

            const result = await service.createMaterial(data);
            expect(result.name).toBe('Ống thép DN100');
            expect(result.workshop).toBe('CT');
        });
    });

    // =============================================
    // SINH MÃ VẬT TƯ (Generate Material ID)
    // =============================================
    describe('Sinh mã Vật tư (generateMaterialId)', () => {
        it('Sinh mã mới dạng VT/OG/00001 khi chưa có dữ liệu', async () => {
            vi.mocked(materialRepository.fetchAll).mockResolvedValueOnce([]);
            const id = await service.generateMaterialId('OG' as WorkshopCode);
            expect(id).toBe('VT/OG/00001');
        });

        it('Sinh mã kế tiếp VT/OG/00002 khi đã có 1 vật tư', async () => {
            vi.mocked(materialRepository.fetchAll).mockResolvedValueOnce([
                { id: 'VT/OG/00001' } as any,
            ]);
            const id = await service.generateMaterialId('OG' as WorkshopCode);
            expect(id).toBe('VT/OG/00002');
        });

        it('Sinh mã độc lập theo từng xưởng', async () => {
            vi.mocked(materialRepository.fetchAll).mockResolvedValueOnce([
                { id: 'VT/OG/00003' } as any,
                { id: 'VT/CT/00001' } as any,
            ]);
            const id = await service.generateMaterialId('CT' as WorkshopCode);
            expect(id).toBe('VT/CT/00002');
        });
    });

    // =============================================
    // XÓA VẬT TƯ (Delete Material)
    // =============================================
    describe('Xóa Vật tư (deleteMaterial)', () => {
        it('Gọi API xóa thành công', async () => {
            const { apiService } = await import('@/services/api');
            await service.deleteMaterial('VT/OG/00001');
            expect(apiService.delete).toHaveBeenCalledWith('/api/materials/VT%2FOG%2F00001');
        });
    });

    // =============================================
    // HỢP NHẤT VẬT TƯ (Merge Materials)
    // =============================================
    describe('Hợp nhất Vật tư (mergeMaterials)', () => {
        it('Ném lỗi nếu chọn ít hơn 2 vật tư', async () => {
            await expect(
                service.mergeMaterials(['VT/OG/00001'], { name: 'Merged', classification: 'ONG_GIO' as any, unit: 'Cái', workshop: 'OG' as WorkshopCode, origin: '' }, 'admin', 'pass')
            ).rejects.toThrow(/at least 2/);
        });

        it('Ném lỗi nếu vật tư nguồn không tồn tại', async () => {
            vi.mocked(materialRepository.fetchById).mockResolvedValue(null);

            await expect(
                service.mergeMaterials(['VT/OG/00001', 'VT/OG/00002'], { name: 'Merged', classification: 'ONG_GIO' as any, unit: 'Cái', workshop: 'OG' as WorkshopCode, origin: '' }, 'admin', 'pass')
            ).rejects.toThrow(/not found/);
        });

        it('Ném lỗi nếu vật tư nguồn từ nhiều xưởng khác nhau', async () => {
            vi.mocked(materialRepository.fetchById)
                .mockResolvedValueOnce({ id: 'VT/OG/00001', name: 'A', workshop: 'OG', unit: 'Cái' } as any)
                .mockResolvedValueOnce({ id: 'VT/CT/00001', name: 'B', workshop: 'CT', unit: 'Cái' } as any);

            await expect(
                service.mergeMaterials(['VT/OG/00001', 'VT/CT/00001'], { name: 'Merged', classification: 'ONG_GIO' as any, unit: 'Cái', workshop: 'OG' as WorkshopCode, origin: '' }, 'admin', 'pass')
            ).rejects.toThrow(/different workshops/);
        });

        it('Ném lỗi nếu vật tư nguồn có đơn vị tính khác nhau', async () => {
            vi.mocked(materialRepository.fetchById)
                .mockResolvedValueOnce({ id: 'VT/OG/00001', name: 'A', workshop: 'OG', unit: 'Cái' } as any)
                .mockResolvedValueOnce({ id: 'VT/OG/00002', name: 'B', workshop: 'OG', unit: 'Mét' } as any);

            await expect(
                service.mergeMaterials(['VT/OG/00001', 'VT/OG/00002'], { name: 'Merged', classification: 'ONG_GIO' as any, unit: 'Cái', workshop: 'OG' as WorkshopCode, origin: '' }, 'admin', 'pass')
            ).rejects.toThrow(/different units/);
        });
    });
});
