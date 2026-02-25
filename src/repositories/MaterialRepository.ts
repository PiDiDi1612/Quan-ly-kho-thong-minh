import { Material } from '@/types';
import { IMaterialRepository } from './interfaces/IMaterialRepository';
import { apiService } from '@/services/api';

/**
 * Material repository implementation
 * Wraps apiService for material data access
 */
export class MaterialRepository implements IMaterialRepository {
    /**
     * Fetch all materials from server
     */
    async fetchAll(): Promise<Material[]> {
        return apiService.get<Material[]>('/api/materials');
    }

    /**
     * Fetch material by ID
     * Note: Server doesn't support specific fetch, so we fetch all and filter
     */
    async fetchById(id: string): Promise<Material | null> {
        try {
            const all = await this.fetchAll();
            return (Array.isArray(all) ? all : []).find(m => m.id === id) || null;
        } catch (error) {
            // Return null if not found
            return null;
        }
    }

    /**
     * Create new material
     */
    async create(material: Omit<Material, 'id'>): Promise<Material> {
        await apiService.post('/api/materials/save', material);
        // Server returns { success: true }, not the object.
        // We should return the material as is, or fetch it.
        // For now, return the input material casted (assuming success)
        // or we can fetchById(material.id) if we had ID.
        // If material doesn't have ID yet (Omit id), this is tricky.
        // But MaterialService ALWAYS generates ID before calling create.
        // So material actually HAS ID. The signature Omit<Material, 'id'> might be loose in interface
        // but implementation sends full object.
        return material as Material;
    }

    /**
     * Update existing material
     */
    async update(id: string, updates: Partial<Material>): Promise<Material> {
        await apiService.post('/api/materials/save', updates);
        // Return updates casted to Material (imperfect but sufficient for now as Service sends full object)
        return updates as Material;
    }

    /**
     * Delete material
     */
    async delete(id: string): Promise<void> {
        await apiService.delete<void>(`/api/materials/${encodeURIComponent(id)}`);
    }

    /**
     * Merge multiple materials into one
     * @deprecated Logic moved to MaterialService using create/delete
     */
    async merge(sourceIds: string[], targetMaterial: Material): Promise<Material> {
        throw new Error('Deprecated: Use MaterialService.mergeMaterials instead');
    }
}

// Export singleton instance
export const materialRepository = new MaterialRepository();
