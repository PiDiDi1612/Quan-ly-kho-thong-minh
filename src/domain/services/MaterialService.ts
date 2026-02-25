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

        // Use apiService for consistent base URL handling and authentication
        const data = await apiService.get<Material[]>(`/api/materials?${params.toString()}`);
        return data;
    }

    /**
     * Generate unique material ID
     * Format: VT/OG/00001
     */
    async generateMaterialId(workshop: WorkshopCode): Promise<string> {
        // Get all materials
        let allMaterials = await materialRepository.fetchAll();
        if (!Array.isArray(allMaterials)) allMaterials = [];

        // Filter by workshop prefix
        const prefix = `VT/${workshop}/`;
        const samePrefixMaterials = allMaterials.filter(m =>
            m.id.startsWith(prefix) && m.workshop === workshop
        );

        // Find max number
        let maxNum = 0;
        for (const material of samePrefixMaterials) {
            const parts = material.id.split('/');
            const num = parseInt(parts[2], 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }

        // Generate next number with padding
        const nextNum = maxNum + 1;
        const paddedNum = nextNum.toString().padStart(5, '0');

        return `VT/${workshop}/${paddedNum}`;
    }

    /**
     * Create new material with duplicate check
     */
    async createMaterial(data: CreateMaterialData & { id?: string }): Promise<Material> {
        // 1. Validation
        if (!data.name || !data.classification || !data.unit || !data.workshop) {
            throw new Error('Missing required fields');
        }

        // 2. Check duplicate name in same workshop
        let allMaterials = await materialRepository.fetchAll();
        if (!Array.isArray(allMaterials)) allMaterials = [];
        const existing = allMaterials.filter(m => m.workshop === data.workshop);

        const duplicate = existing.find(m =>
            m.name.toLowerCase().trim() === data.name.toLowerCase().trim() &&
            m.workshop === data.workshop
        );

        if (duplicate) {
            throw new Error(`Material "${data.name}" already exists in workshop ${data.workshop}`);
        }

        // 3. Generate or validate material ID
        let materialId: string;
        if (data.id) {
            // Check if custom ID already exists
            const existingId = await materialRepository.fetchById(data.id);
            if (existingId) {
                throw new Error(`Material ID "${data.id}" already exists`);
            }
            materialId = data.id;
        } else {
            materialId = await this.generateMaterialId(data.workshop);
        }

        // 4. Create material object
        const newMaterial: Material = {
            id: materialId,
            name: data.name.trim(),
            classification: data.classification,
            unit: data.unit,
            workshop: data.workshop,
            quantity: 0, // New material starts with 0 stock
            minThreshold: data.minThreshold || BUSINESS_CONSTANTS.DEFAULTS.MIN_THRESHOLD,
            lastUpdated: new Date().toISOString(),
            origin: data.origin || '',
            note: data.note,
        };

        // 5. Save to database
        const created = await materialRepository.create(newMaterial);

        return created;
    }

    /**
     * Update material information
     * Prevents changing ID and workshop
     */
    async updateMaterial(
        materialId: string,
        updates: Partial<Material>
    ): Promise<Material> {
        // 1. Fetch existing material
        const material = await materialRepository.fetchById(materialId);
        if (!material) {
            throw new Error('Material not found');
        }

        // 2. Validate updates
        if (updates.id && updates.id !== materialId) {
            throw new Error('Cannot change material ID');
        }

        if (updates.workshop && updates.workshop !== material.workshop) {
            throw new Error('Cannot change workshop - materials are workshop-specific');
        }

        // 3. Apply updates
        const updatedMaterial = await materialRepository.update(materialId, {
            ...material,
            ...updates,
            id: materialId, // Ensure ID doesn't change
            workshop: material.workshop, // Ensure workshop doesn't change
        });

        return updatedMaterial;
    }

    /**
     * Delete material - only allowed if no transactions exist
     */
    async deleteMaterial(materialId: string): Promise<void> {
        // Delegate to backend which has proper transaction checks
        await apiService.delete(`/api/materials/${materialId}`);
    }

    /**
     * Merge multiple materials into one
     * DESTRUCTIVE OPERATION - requires admin role
     */
    async mergeMaterials(
        sourceMaterialIds: string[],
        targetData: MergeMaterialsData,
        userId: string,
        password: string
    ): Promise<Material> {

        // 1. **ADMIN VALIDATION**
        // TODO: Implement proper admin authentication
        // For now, we trust the client-side permission check

        // 2. Basic validation
        if (sourceMaterialIds.length < 2) {
            throw new Error('Need at least 2 materials to merge');
        }

        // 3. Fetch all source materials
        const sourceMaterials = await Promise.all(
            sourceMaterialIds.map(id => materialRepository.fetchById(id))
        );

        // Check all exist
        const missingMaterials = sourceMaterials.filter(m => !m);
        if (missingMaterials.length > 0) {
            throw new Error('One or more source materials not found');
        }

        // Filter out nulls for type safety
        const validSources = sourceMaterials.filter((m): m is Material => m !== null);

        // 4. **VALIDATE COMPATIBILITY**
        const workshops = new Set(validSources.map(m => m.workshop));
        if (workshops.size > 1) {
            throw new Error(
                `Cannot merge materials from different workshops: ${Array.from(workshops).join(', ')}`
            );
        }

        const units = new Set(validSources.map(m => m.unit));
        if (units.size > 1) {
            throw new Error(
                `Cannot merge materials with different units: ${Array.from(units).join(', ')}`
            );
        }

        const workshop = validSources[0].workshop;
        const unit = validSources[0].unit;

        // 5. Verify target data matches
        if (targetData.workshop !== workshop) {
            throw new Error('Target workshop must match source materials');
        }

        if (targetData.unit !== unit) {
            throw new Error('Target unit must match source materials');
        }

        // 6. **CHECK FOR DUPLICATE TARGET NAME**
        // IMPORTANT: Exclude the source materials being merged from this check
        let allMaterials = await materialRepository.fetchAll();
        if (!Array.isArray(allMaterials)) allMaterials = [];

        const duplicate = allMaterials.find(m =>
            m.name.toLowerCase().trim() === targetData.name.toLowerCase().trim() &&
            m.workshop === workshop &&
            !sourceMaterialIds.includes(m.id) // Exclude source materials being merged
        );

        if (duplicate) {
            throw new Error(
                `Tên vật tư "${targetData.name}" đã tồn tại trong xưởng ${workshop}. ` +
                `Vui lòng chọn tên khác cho vật tư sau khi hợp nhất.`
            );
        }

        // 7. **CREATE NEW MATERIAL**
        const newMaterial = await this.createMaterial({
            name: targetData.name,
            classification: targetData.classification,
            unit: targetData.unit,
            workshop: targetData.workshop,
            origin: targetData.origin,
            note: targetData.note || `Merged from ${sourceMaterialIds.length} materials`,
        });

        console.log('Created new merged material:', newMaterial.id);

        // 7. **UPDATE ALL TRANSACTIONS** to point to new material
        // This is the DESTRUCTIVE part
        let updatedTransactionCount = 0;

        for (const sourceId of sourceMaterialIds) {
            const transactions = inventoryService.getStockHistory(sourceId);

            console.log(`Updating ${transactions.length} transactions for material ${sourceId}`);

            for (const tx of transactions) {
                // Update transaction to point to new material
                await transactionRepository.update(tx.id, {
                    ...tx,
                    materialId: newMaterial.id,
                    materialName: newMaterial.name,
                });
                updatedTransactionCount++;
            }
        }

        console.log(`Updated ${updatedTransactionCount} transactions`);

        // 8. **DELETE SOURCE MATERIALS**
        for (const sourceId of sourceMaterialIds) {
            await materialRepository.delete(sourceId);
            console.log(`Deleted source material: ${sourceId}`);
        }

        // 9. Invalidate inventory cache
        inventoryService.clearCache();

        console.log('Merge completed successfully');

        return newMaterial;
    }

    /**
     * Import materials from Excel
     * Expected format: [Name, Classification, Unit, Workshop, MinThreshold, Origin, Note]
     */
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

        // Skip header row (assuming first row is headers)
        const dataRows = excelData.slice(1);

        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            const rowNum = i + 2; // +2 because 1-indexed and skipped header

            try {
                // Parse row
                const [name, classification, unit, workshop, minThreshold, origin, note] = row;

                // Validation
                if (!name || !classification || !unit || !workshop) {
                    results.errors.push(`Row ${rowNum}: Missing required fields (name/classification/unit/workshop)`);
                    continue;
                }

                // Check if material exists (same name + workshop)
                let allMaterials = await materialRepository.fetchAll();
                if (!Array.isArray(allMaterials)) allMaterials = [];

                const existing = allMaterials.filter(m => m.workshop === workshop);
                const duplicate = existing.find(m =>
                    m.name.toLowerCase().trim() === String(name).toLowerCase().trim()
                );

                if (duplicate) {
                    // UPDATE existing material
                    await this.updateMaterial(duplicate.id, {
                        classification,
                        unit,
                        minThreshold: minThreshold || BUSINESS_CONSTANTS.DEFAULTS.MIN_THRESHOLD,
                        origin,
                        note,
                    });
                    results.updated++;

                } else {
                    // CREATE new material
                    await this.createMaterial({
                        name: String(name),
                        classification,
                        unit,
                        workshop,
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

    /**
     * List materials with filters
     * Delegates to repository
     */
    async listMaterials(filters: {
        workshop?: WorkshopCode;
        classification?: MaterialClassification;
        searchTerm?: string;
    }): Promise<Material[]> {

        let materials = await materialRepository.fetchAll();

        // Defensive check: Ensure materials is an array
        if (!Array.isArray(materials)) {
            console.error('MaterialService.listMaterials: Expected an array from repository, got:', materials);
            return [];
        }

        // Apply workshop filter
        if (filters.workshop) {
            materials = materials.filter(m => m.workshop === filters.workshop);
        }

        // Apply classification filter
        if (filters.classification) {
            materials = materials.filter(m => m.classification === filters.classification);
        }

        // Apply search term if provided
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

// Export singleton instance
export const materialService = new MaterialService();
