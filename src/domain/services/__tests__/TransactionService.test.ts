/**
 * MANUAL TEST for TransactionService
 * 
 * Run this test to verify TransactionService functionality
 * 
 * HOW TO RUN:
 * 1. Import this in your dev environment
 * 2. Call testTransactionService() from browser console
 * 3. Check console output for results
 */

import { transactionService } from '../TransactionService';
import { TransactionType, WorkshopCode } from '@/types';

export async function testTransactionService() {
    console.log('🧪 Starting TransactionService Manual Tests...\n');

    const results = {
        passed: 0,
        failed: 0,
        errors: [] as string[]
    };

    // ========================================
    // TEST 1: Generate Receipt ID
    // ========================================
    try {
        console.log('📋 TEST 1: Generate Receipt ID');

        const receiptId1 = await transactionService.generateReceiptId(
            TransactionType.IN,
            'OG' as WorkshopCode // Ống Gió
        );

        console.log('  Generated ID:', receiptId1);

        // Verify format: PNK/OG/24/00001
        const pattern = /^PNK\/OG\/\d{2}\/\d{5}$/;
        if (pattern.test(receiptId1)) {
            console.log('  ✅ Format correct');
            results.passed++;
        } else {
            console.error('  ❌ Format incorrect');
            results.failed++;
            results.errors.push('Receipt ID format mismatch');
        }

        // Generate another to verify increment
        const receiptId2 = await transactionService.generateReceiptId(
            TransactionType.IN,
            'OG' as WorkshopCode
        );
        console.log('  Generated ID 2:', receiptId2);

        if (receiptId2 > receiptId1) {
            console.log('  ✅ ID increments correctly\n');
            results.passed++;
        } else {
            console.error('  ❌ ID does not increment\n');
            results.failed++;
            results.errors.push('Receipt ID not incrementing');
        }

    } catch (error: any) {
        console.error('  ❌ TEST 1 FAILED:', error.message, '\n');
        results.failed += 2;
        results.errors.push(`TEST 1: ${error.message}`);
    }

    // ========================================
    // TEST 2: Create Inbound Receipt
    // ========================================
    try {
        console.log('📥 TEST 2: Create Inbound Receipt');

        const inboundData = {
            materialId: 'test-material-001',
            quantity: 100,
            workshop: 'OG' as WorkshopCode,
            supplier: 'Test Supplier',
            orderCode: 'ORDER-001',
            note: 'Test inbound receipt'
        };

        const inboundReceipt = await transactionService.createInboundReceipt(inboundData);

        console.log('  Created Receipt:', {
            id: inboundReceipt.id,
            receiptId: inboundReceipt.receiptId,
            type: inboundReceipt.type,
            quantity: inboundReceipt.quantity
        });

        if (inboundReceipt.type === TransactionType.IN &&
            inboundReceipt.quantity === 100) {
            console.log('  ✅ Inbound receipt created successfully\n');
            results.passed++;
        } else {
            console.error('  ❌ Inbound receipt data incorrect\n');
            results.failed++;
            results.errors.push('Inbound receipt data mismatch');
        }

    } catch (error: any) {
        console.error('  ❌ TEST 2 FAILED:', error.message, '\n');
        results.failed++;
        results.errors.push(`TEST 2: ${error.message}`);
    }

    // ========================================
    // TEST 3: Create Outbound Receipt (Should Fail - No Stock)
    // ========================================
    try {
        console.log('📤 TEST 3: Create Outbound Receipt (Expect FAIL)');

        const outboundData = {
            materialId: 'nonexistent-material',
            quantity: 50,
            workshop: 'OG' as WorkshopCode,
            orderCode: 'ORDER-002',
            note: 'Test outbound - should fail'
        };

        try {
            await transactionService.createOutboundReceipt(outboundData);
            console.error('  ❌ Should have thrown error (insufficient stock)\n');
            results.failed++;
            results.errors.push('Outbound did not validate stock');
        } catch (validationError: any) {
            console.log('  ✅ Correctly blocked (insufficient stock)');
            console.log('  Error:', validationError.message, '\n');
            results.passed++;
        }

    } catch (error: any) {
        console.error('  ❌ TEST 3 UNEXPECTED ERROR:', error.message, '\n');
        results.failed++;
        results.errors.push(`TEST 3: ${error.message}`);
    }

    // ========================================
    // TEST 4: Create Outbound Receipt (With Stock)
    // ========================================
    try {
        console.log('📤 TEST 4: Create Outbound Receipt (With Stock)');
        console.log('  Note: This test requires existing inventory');
        console.log('  Skipping automated test - manual verification needed\n');
        // Skip this test as it requires pre-existing stock

    } catch (error: any) {
        console.error('  ❌ TEST 4 FAILED:', error.message, '\n');
    }

    // ========================================
    // TEST 5: Create Transfer Receipt (Should Fail - No Stock)
    // ========================================
    try {
        console.log('🔄 TEST 5: Create Transfer Receipt (Expect FAIL)');

        const transferData = {
            materialId: 'nonexistent-material',
            quantity: 30,
            fromWorkshop: 'OG' as WorkshopCode,
            toWorkshop: 'CT' as WorkshopCode,
            note: 'Test transfer - should fail'
        };

        try {
            await transactionService.createTransferReceipt(transferData);
            console.error('  ❌ Should have thrown error (insufficient stock)\n');
            results.failed++;
            results.errors.push('Transfer did not validate stock');
        } catch (validationError: any) {
            console.log('  ✅ Correctly blocked (insufficient stock)');
            console.log('  Error:', validationError.message, '\n');
            results.passed++;
        }

    } catch (error: any) {
        console.error('  ❌ TEST 5 UNEXPECTED ERROR:', error.message, '\n');
        results.failed++;
        results.errors.push(`TEST 5: ${error.message}`);
    }

    // ========================================
    // TEST 6: Validate Same Workshop Transfer
    // ========================================
    try {
        console.log('🔄 TEST 6: Transfer to Same Workshop (Expect FAIL)');

        const sameWorkshopData = {
            materialId: 'test-material-001',
            quantity: 10,
            fromWorkshop: 'OG' as WorkshopCode,
            toWorkshop: 'OG' as WorkshopCode, // Same!
            note: 'Invalid transfer'
        };

        try {
            await transactionService.createTransferReceipt(sameWorkshopData);
            console.error('  ❌ Should have thrown error (same workshop)\n');
            results.failed++;
            results.errors.push('Transfer allowed same workshop');
        } catch (validationError: any) {
            console.log('  ✅ Correctly blocked (same workshop)');
            console.log('  Error:', validationError.message, '\n');
            results.passed++;
        }

    } catch (error: any) {
        console.error('  ❌ TEST 6 UNEXPECTED ERROR:', error.message, '\n');
        results.failed++;
        results.errors.push(`TEST 6: ${error.message}`);
    }

    // ========================================
    // SUMMARY
    // ========================================
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);

    if (results.errors.length > 0) {
        console.log('\n❌ Errors:');
        results.errors.forEach((err, i) => {
            console.log(`  ${i + 1}. ${err}`);
        });
    }

    if (results.failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED!');
    } else {
        console.log('\n⚠️  SOME TESTS FAILED - Review errors above');
    }

    return results;
}

// Instructions for running
console.log(`
📖 HOW TO RUN TESTS:

1. In browser console, import this file
2. Run: testTransactionService()
3. Check console output

Note: Some tests require existing inventory data to pass.
Tests 1, 3, 5, 6 should pass without any data.
`);
