import { Supplier } from '../../types';

export interface ISupplierService {
    listSuppliers(): Promise<Supplier[]>;
    createSupplier(supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<void>;
    updateSupplier(supplier: Partial<Supplier> & { id: string }): Promise<void>;
    deleteSupplier(id: string): Promise<void>;
    mergeSuppliers(supplierIds: string[], primaryCode: string, primaryName: string, description?: string): Promise<{ success: boolean; message: string }>;
    importFromExcel(data: any[]): Promise<{ imported: number; updated: number; total: number }>;
    generateSupplierCode(existingSuppliers: Supplier[]): string;
}
