import { ISupplierRepository } from '../domain/interfaces/ISupplierRepository';
import { Supplier } from '../types';
import { apiService } from '../services/api';

class SupplierRepository implements ISupplierRepository {
    async list(): Promise<Supplier[]> {
        return apiService.get<Supplier[]>('/api/customer-codes');
    }

    async create(supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
        await apiService.post('/api/customer-codes/save', supplier);
    }

    async update(supplier: Partial<Supplier> & { id: string }): Promise<void> {
        await apiService.post('/api/customer-codes/save', supplier);
    }

    async delete(id: string): Promise<void> {
        await apiService.post('/api/customer-codes/delete', { id });
    }

    async merge(
        supplierIds: string[],
        primaryCode: string,
        primaryName: string,
        description?: string
    ): Promise<{ success: boolean; message: string }> {
        return apiService.post('/api/customer-codes/merge', {
            supplierIds,
            primaryCode,
            primaryName,
            description
        });
    }

    async import(suppliers: Partial<Supplier>[]): Promise<{ imported: number; updated: number; total: number }> {
        // API expects { codes: [...] } structure
        // We map generic partial supplier to the structure backend needs if necessary, 
        // but the backend seems to accept array of objects with code, name, description.
        return apiService.post('/api/customer-codes/import', { codes: suppliers });
    }
}

export const supplierRepository = new SupplierRepository();
