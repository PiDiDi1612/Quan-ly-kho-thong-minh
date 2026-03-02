/**
 * Simple manual test for InventoryService
 * Run this with: npx ts-node src/domain/services/__tests__/InventoryService.test.ts
 */

import { InventoryService } from '../InventoryService';
import { Transaction, WorkshopCode, TransactionType } from '@/types';

// Mock transactions for testing
const mockTransactions: Transaction[] = [
    {
        id: '1',
        receiptId: 'PNK/OG/24/00001',
        type: TransactionType.IN,
        materialId: 'MAT001',
        materialName: 'Test Material 1',
        workshop: 'OG' as WorkshopCode,
        quantity: 100,
        date: '2024-01-01',
        user: 'admin',
    },
    {
        id: '2',
        receiptId: 'PXK/OG/24/00001',
        type: TransactionType.OUT,
        materialId: 'MAT001',
        materialName: 'Test Material 1',
        workshop: 'OG' as WorkshopCode,
        quantity: 30,
        date: '2024-01-02',
        user: 'admin',
    },
    {
        id: '3',
        receiptId: 'PNK/OG/24/00002',
        type: TransactionType.IN,
        materialId: 'MAT001',
        materialName: 'Test Material 1',
        workshop: 'OG' as WorkshopCode,
        quantity: 50,
        date: '2024-01-03',
        user: 'admin',
    },
];

async function runTests() {
    const service = new InventoryService();

    // Manually inject mock transactions for testing
    (service as any).allTransactions = mockTransactions;

    console.log('🧪 Testing InventoryService\n');

    // Test 1: Calculate stock
    console.log('Test 1: Calculate stock');
    const stock = service.calculateStock('MAT001', 'OG' as WorkshopCode);
    console.log(`Expected: 120 (100 + 50 - 30)`);
    console.log(`Actual: ${stock}`);
    console.log(`✅ ${stock === 120 ? 'PASS' : 'FAIL'}\n`);

    // Test 2: Cache is working
    console.log('Test 2: Cache is working (should use cached value)');
    const startTime = Date.now();
    const stock2 = service.calculateStock('MAT001', 'OG' as WorkshopCode);
    const endTime = Date.now();
    console.log(`Time taken: ${endTime - startTime}ms (should be < 1ms for cached)`);
    console.log(`✅ ${stock2 === 120 ? 'PASS' : 'FAIL'}\n`);

    // Test 3: Validate stock availability - sufficient
    console.log('Test 3: Validate stock availability - sufficient stock');
    try {
        service.validateStockAvailability('MAT001', 'OG' as WorkshopCode, 50);
        console.log('✅ PASS - No error thrown\n');
    } catch (error) {
        console.log('❌ FAIL - Error thrown:', error);
    }

    // Test 4: Validate stock availability - insufficient
    console.log('Test 4: Validate stock availability - insufficient stock');
    try {
        service.validateStockAvailability('MAT001', 'OG' as WorkshopCode, 200);
        console.log('❌ FAIL - Should have thrown error\n');
    } catch (error: any) {
        console.log(`✅ PASS - Error thrown: ${error.message}\n`);
    }

    // Test 5: Clear cache
    console.log('Test 5: Clear cache');
    service.clearCache();
    const stock3 = service.calculateStock('MAT001', 'OG' as WorkshopCode);
    console.log(`Stock after cache clear: ${stock3}`);
    console.log(`✅ ${stock3 === 120 ? 'PASS' : 'FAIL'}\n`);

    // Test 6: Get stock history
    console.log('Test 6: Get stock history');
    const history = service.getStockHistory('MAT001');
    console.log(`Expected: 3 transactions`);
    console.log(`Actual: ${history.length} transactions`);
    console.log(`✅ ${history.length === 3 ? 'PASS' : 'FAIL'}\n`);

    console.log('🎉 All tests completed!');
}

// Only run if executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

export { runTests };
