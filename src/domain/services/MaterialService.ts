import { Material, MaterialClassification, WorkshopCode } from '@/types';
import {
    IMaterialService,
    CreateMaterialData,
    MergeMaterialsData
} from '@/domain/interfaces/IMaterialService';
import { materialRepository } from '@/repositories';
import { inventoryService } from './InventoryService';
import { transactionRepository } from '@/repositories';
import { BUSINESS_CONSTANTS } from '@/domain/constants';
import { apiService } from '@/services/api';

/**
 * Material Service - Handles all material management operations
 * Including CRUD, merge, and Excel import
 */
export class MaterialService implements IMaterialService {

    async getMaterials(): Promise<Material[]> {
        return await materialRepository.fetchAll();
    }

    async getMaterialsWithStock(startDate?: string, endDate?: string): Promise<Material[]> {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const response = await apiService.get<any>(`/api/materials?${params.toString()}`);

        if (response && response.data && Array.isArray(response.data)) {
            return response.data;
        }

        return Array.isArray(response) ? response : [];
    }

    /**
     * Generate unique material ID
     * Format: VT/OG/00001
     */
    async generateMaterialId(workshop: WorkshopCode): Promise<string> {
        let allMaterials = await materialRepository.fetchAll();
        if (!Array.isArray(allMaterials)) allMaterials = [];

        const prefix = `VT/${workshop}/`;
        const samePrefixMaterials = allMaterials.filter(m =>
            m.id && m.id.startsWith(prefix)
        );

        let maxNum = 0;
        for (const material of samePrefixMaterials) {
            const parts = material.id.split('/');
            if (parts.length >= 3) {
                const num = parseInt(parts[2], 10);
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                }
            }
        }

        const nextNum = maxNum + 1;
        const paddedNum = nextNum.toString().padStart(5, '0');

        return `VT/${workshop}/${paddedNum}`;
    }

    /**
     * Create new material with duplicate check
     */
    async createMaterial(data: CreateMaterialData & { id?: string }): Promise<Material> {
        if (!data.name || !data.classification || !data.unit || !data.workshop) {
            throw new Error('Missing required fields');
        }

        let allMaterials = await materialRepository.fetchAll();
        if (!Array.isArray(allMaterials)) allMaterials = [];

        const duplicate = allMaterials.find(m =>
            m.name.toLowerCase().trim() === data.name.toLowerCase().trim() &&
            m.workshop === data.workshop
        );

        if (duplicate) {
            throw new Error(`Material "${data.name}" already exists in workshop ${data.workshop}`);
        }

        let materialId: string;
        if (data.id) {
            const existingId = await materialRepository.fetchById(data.id);
            if (existingId) {
                throw new Error(`Material ID "${data.id}" already exists`);
            }
            materialId = data.id;
        } else {
            materialId = await this.generateMaterialId(data.workshop);
        }

        const newMaterial: Material = {
            id: materialId,
            name: data.name.trim(),
            classification: data.classification,
            unit: data.unit,
            workshop: data.workshop,
            quantity: 0,
            minThreshold: data.minThreshold || BUSINESS_CONSTANTS.DEFAULTS.MIN_THRESHOLD,
            lastUpdated: new Date().toISOString(),
            origin: data.origin || '',
            note: data.note,
        };

        const created = await materialRepository.create(newMaterial);
        return created;
    }

    async updateMaterial(
        materialId: string,
        updates: Partial<Material>
    ): Promise<Material> {
        const material = await materialRepository.fetchById(materialId);
        if (!material) {
            throw new Error('Material not found');
        }

        if (updates.id && updates.id !== materialId) {
            throw new Error('Cannot change material ID');
        }

        if (updates.workshop && updates.workshop !== material.workshop) {
            throw new Error('Cannot change workshop - materials are workshop-specific');
        }

        const updatedMaterial = await materialRepository.update(materialId, {
            ...material,
            ...updates,
            id: materialId,
            workshop: material.workshop,
        });

        return updatedMaterial;
    }

    async deleteMaterial(materialId: string): Promise<void> {
        await apiService.delete(`/api/materials/${encodeURIComponent(materialId)}`);
    }

    async mergeMaterials(
        sourceMaterialIds: string[],
        targetData: MergeMaterialsData,
        userId: string,
        password: string
    ): Promise<Material> {
        if (sourceMaterialIds.length < 2) {
            throw new Error('Need at least 2 materials to merge');
        }

        const sourceMaterials = await Promise.all(
            sourceMaterialIds.map(id => materialRepository.fetchById(id))
        );

        const missingMaterials = sourceMaterials.filter(m => !m);
        if (missingMaterials.length > 0) {
            throw new Error('One or more source materials not found');
        }

        const validSources = sourceMaterials.filter((m): m is Material => m !== null);

        const workshops = new Set(validSources.map(m => m.workshop));
        if (workshops.size > 1) {
            throw new Error(`Cannot merge materials from different workshops: ${Array.from(workshops).join(', ')}`);
        }

        const units = new Set(validSources.map(m => m.unit));
        if (units.size > 1) {
            throw new Error(`Cannot merge materials with different units: ${Array.from(units).join(', ')}`);
        }

        const workshop = validSources[0].workshop;
        const unit = validSources[0].unit;

        if (targetData.workshop !== workshop) {
            throw new Error('Target workshop must match source materials');
        }

        if (targetData.unit !== unit) {
            throw new Error('Target unit must match source materials');
        }

        let allMaterials = await materialRepository.fetchAll();
        if (!Array.isArray(allMaterials)) allMaterials = [];

        const duplicate = allMaterials.find(m =>
            m.name.toLowerCase().trim() === targetData.name.toLowerCase().trim() &&
            m.workshop === workshop &&
            !sourceMaterialIds.includes(m.id)
        );

        if (duplicate) {
            throw new Error(`Tên vật tư "${targetData.name}" đã tồn tại trong xưởng ${workshop}. Vui lòng chọn tên khác.`);
        }

        const newMaterial = await this.createMaterial({
            name: targetData.name,
            classification: targetData.classification,
            unit: targetData.unit,
            workshop: targetData.workshop,
            origin: targetData.origin,
            note: targetData.note || `Merged from ${sourceMaterialIds.length} materials`,
        });

        let updatedTransactionCount = 0;

        for (const sourceId of sourceMaterialIds) {
            const transactions = inventoryService.getStockHistory(sourceId);
            for (const tx of transactions) {
                await transactionRepository.update(tx.id, {
                    ...tx,
                    materialId: newMaterial.id,
                    materialName: newMaterial.name,
                });
                updatedTransactionCount++;
            }
        }

        for (const sourceId of sourceMaterialIds) {
            await materialRepository.delete(sourceId);
        }

        inventoryService.clearCache();
        return newMaterial;
    }

    async importFromExcel(excelData: any[][]): Promise<{
        imported: number;
        updated: number;
        errors: string[];
    }> {
        const results = {
            imported: 0,
            updated: 0,
            errors: [] as string[]
        };

        const dataRows = excelData.slice(1);
        let allMaterials = await materialRepository.fetchAll();
        if (!Array.isArray(allMaterials)) allMaterials = [];

        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            const rowNum = i + 2;

            try {
                const [name, classification, unit, workshop, minThreshold, origin, note] = row;

                if (!name || !classification || !unit || !workshop) {
                    results.errors.push(`Row ${rowNum}: Missing required fields`);
                    continue;
                }

                const existing = allMaterials.filter(m => m.workshop === workshop);
                const duplicate = existing.find(m =>
                    m.name.toLowerCase().trim() === String(name).toLowerCase().trim()
                );

                if (duplicate) {
                    await this.updateMaterial(duplicate.id, {
                        classification,
                        unit,
                        minThreshold: minThreshold || BUSINESS_CONSTANTS.DEFAULTS.MIN_THRESHOLD,
                        origin,
                        note,
                    });
                    results.updated++;
                } else {
                    await this.createMaterial({
                        name: String(name),
                        classification: classification as any,
                        unit,
                        workshop: workshop as any,
                        minThreshold,
                        origin,
                        note,
                    });
                    results.imported++;
                }

            } catch (error: any) {
                results.errors.push(`Row ${rowNum}: ${error.message}`);
            }
        }

        return results;
    }

    async listMaterials(filters: {
        workshop?: WorkshopCode;
        classification?: MaterialClassification;
        searchTerm?: string;
    }): Promise<Material[]> {
        let materials = await materialRepository.fetchAll();

        if (!Array.isArray(materials)) {
            return [];
        }

        if (filters.workshop) {
            materials = materials.filter(m => m.workshop === filters.workshop);
        }

        if (filters.classification) {
            materials = materials.filter(m => m.classification === filters.classification);
        }

        if (filters.searchTerm) {
            const searchLower = filters.searchTerm.toLowerCase();
            materials = materials.filter(m =>
                m.name.toLowerCase().includes(searchLower) ||
                m.id.toLowerCase().includes(searchLower) ||
                (m.origin && m.origin.toLowerCase().includes(searchLower))
            );
        }

        return materials;
    }
}

export const materialService = new MaterialService();
