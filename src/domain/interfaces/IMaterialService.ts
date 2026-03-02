import { Material, MaterialClassification, WorkshopCode } from '@/types';

export interface CreateMaterialData {
    name: string;
    classification: MaterialClassification;
    unit: string;
    workshop: WorkshopCode;
    minThreshold?: number;
    origin?: string;
    note?: string;
}

export interface MergeMaterialsData {
    name: string;
    classification: MaterialClassification;
    unit: string;
    workshop: WorkshopCode;
    origin?: string;
    note?: string;
}

export interface IMaterialService {
    getMaterials(): Promise<Material[]>;
    getMaterialsWithStock(startDate?: string, endDate?: string): Promise<Material[]>;
    /**
     * Create new material
     */
    createMaterial(data: CreateMaterialData): Promise<Material>;

    /**
     * Update material information
     */
    updateMaterial(materialId: string, updates: Partial<Material>): Promise<Material>;

    /**
     * Delete material (only if stock = 0)
     * @throws Error if stock > 0
     */
    deleteMaterial(materialId: string): Promise<void>;

    /**
     * Merge multiple materials into one
     * DESTRUCTIVE OPERATION - requires admin role
     * @throws Error if incompatible units or workshops
     */
    mergeMaterials(
        sourceMaterialIds: string[],
        targetData: MergeMaterialsData,
        userId: string,
        password: string
    ): Promise<Material>;

    /**
     * Import materials from Excel
     */
    importFromExcel(excelData: any[][]): Promise<{
        imported: number;
        updated: number;
        errors: string[];
    }>;

    /**
     * Generate material ID
     * Format: VT/OG/00001
     */
    generateMaterialId(workshop: WorkshopCode): Promise<string>;

    /**
     * List materials with filters
     */
    listMaterials(filters: {
        workshop?: WorkshopCode;
        classification?: MaterialClassification;
        searchTerm?: string;
    }): Promise<Material[]>;
}
