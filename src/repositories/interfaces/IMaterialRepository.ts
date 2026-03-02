import { Material } from '@/types';

export interface IMaterialRepository {
    /**
<<<<<<< HEAD
     * Fetch all materials (unpaginated)
=======
     * Fetch all materials
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
     */
    fetchAll(): Promise<Material[]>;

    /**
<<<<<<< HEAD
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
=======
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
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
