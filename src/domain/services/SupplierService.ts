import { ISupplierService } from '../interfaces/ISupplierService';
import { ISupplierRepository } from '../interfaces/ISupplierRepository';
import { supplierRepository } from '../../repositories/SupplierRepository'; // Dependency Injection would be better but singleton is practical here
import { Supplier } from '../../types';

class SupplierService implements ISupplierService {
    private repository: ISupplierRepository;

    constructor(repository: ISupplierRepository) {
        this.repository = repository;
    }

    async listSuppliers(): Promise<Supplier[]> {
        return this.repository.list();
    }

    async createSupplier(supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
        // Business logic: Check for duplicates? Backend handles unique constraint on 'code'.
        await this.repository.create(supplier);
    }

    async updateSupplier(supplier: Partial<Supplier> & { id: string }): Promise<void> {
        await this.repository.update(supplier);
    }

    async deleteSupplier(id: string): Promise<void> {
        await this.repository.delete(id);
    }

    async mergeSuppliers(
        supplierIds: string[],
        primaryCode: string,
        primaryName: string,
        description?: string
    ): Promise<{ success: boolean; message: string }> {
        if (!supplierIds || supplierIds.length < 2) {
            throw new Error('Vui lòng chọn ít nhất 2 NCC để hợp nhất.');
        }
        if (!primaryCode || !primaryName) {
            throw new Error('Thiếu thông tin NCC chính.');
        }
        return this.repository.merge(supplierIds, primaryCode, primaryName, description);
    }

    async importFromExcel(data: any[]): Promise<{ imported: number; updated: number; total: number }> {
        // Transform Excel data to Supplier objects
        // Assuming data is array of objects like { 'Mã NCC': '...', 'Tên NCC': '...' }
        const suppliers = data.map((row: any) => ({
            code: row['Mã NCC'] || row['code'] || '',
            name: row['Tên NCC'] || row['name'] || '',
            description: row['Mô tả'] || row['description'] || ''
        })).filter(c => c.code && c.name);

        if (suppliers.length === 0) {
            throw new Error('Không tìm thấy dữ liệu hợp lệ trong file Excel.\nĐảm bảo file có các cột: "Mã NCC", "Tên NCC", "Mô tả"');
        }

        return this.repository.import(suppliers);
    }

    generateSupplierCode(existingSuppliers: Supplier[]): string {
        if (existingSuppliers.length === 0) return 'NCC001';

        const existingCodes = existingSuppliers
            .map(s => s.code)
            .filter(code => code.startsWith('NCC'))
            .map(code => {
                const num = parseInt(code.replace('NCC', ''), 10);
                return isNaN(num) ? 0 : num;
            });

        const maxNum = Math.max(0, ...existingCodes);
        const nextNum = maxNum + 1;
        return `NCC${nextNum.toString().padStart(3, '0')}`;
    }
}

export const supplierService = new SupplierService(supplierRepository);
