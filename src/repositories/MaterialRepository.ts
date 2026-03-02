import { Material } from '@/types';
import { IMaterialRepository } from './interfaces/IMaterialRepository';
import { apiService } from '@/services/api';

/**
 * Material repository implementation
 * Wraps apiService for material data access
 */
export class MaterialRepository implements IMaterialRepository {
    /**
<<<<<<< HEAD
     * Fetch all materials from server (unpaginated list for internal logic)
     */
    async fetchAll(): Promise<Material[]> {
        return apiService.get<Material[]>('/api/materials/all');
    }

    /**
     * Fetch paginated materials for UI display
     */
    async fetchPaginated(params: any): Promise<any> {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                query.append(key, String(value));
            }
        });
        return apiService.get<any>(`/api/materials?${query.toString()}`);
=======
     * Fetch all materials from server
     */
    async fetchAll(): Promise<Material[]> {
<<<<<<< HEAD
        return apiService.get<Material[]>('/api/materials/all');
=======
        return apiService.get<Material[]>('/api/materials');
>>>>>>> d05f493e79576293327e4ea22983bce155a6b685
>>>>>>> aa6ebc5d00f0116ac8e241ae94857c8ef4ff16c8
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
