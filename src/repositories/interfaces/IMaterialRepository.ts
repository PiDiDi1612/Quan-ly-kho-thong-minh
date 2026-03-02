import { Material } from '@/types';

export interface IMaterialRepository {
    /**
     * Fetch all materials (unpaginated)
     */
    fetchAll(): Promise<Material[]>;

    /**
     * Fetch materials with pagination and filters
     */
    fetchPaginated(params: {
        page?: number;
        limit?: number;
        search?: string;
        workshop?: string;
        classification?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<{
        data: Material[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;

    /**
     * Fetch material by ID
     */
    fetchById(id: string): Promise<Material | null>;

    /**
     * Create material
     */
    create(material: Omit<Material, 'id'>): Promise<Material>;

    /**
     * Update material
     */
    update(id: string, updates: Partial<Material>): Promise<Material>;

    /**
     * Delete material
     */
    delete(id: string): Promise<void>;

    /**
     * Merge materials
     */
    merge(sourceIds: string[], targetMaterial: Material): Promise<Material>;
}
