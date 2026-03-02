import { Material } from '@/types';

export interface IMaterialRepository {
    /**
     * Fetch all materials
     */
    fetchAll(): Promise<Material[]>;

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
