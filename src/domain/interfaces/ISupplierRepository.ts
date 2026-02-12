import { Supplier } from '../../types';

export interface ISupplierRepository {
    list(): Promise<Supplier[]>;
    create(supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<void>;
    update(supplier: Partial<Supplier> & { id: string }): Promise<void>;
    delete(id: string): Promise<void>;
    merge(supplierIds: string[], primaryCode: string, primaryName: string, description?: string): Promise<{ success: boolean; message: string }>;
    import(suppliers: Partial<Supplier>[]): Promise<{ imported: number; updated: number; total: number }>;
}
