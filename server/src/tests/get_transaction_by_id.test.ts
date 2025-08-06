
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable, catalogItemsTable, transactionItemsTable } from '../db/schema';
import { type CreateTransactionInput } from '../schema';
import { getTransactionById } from '../handlers/get_transaction_by_id';

// Test transaction input
const testTransactionInput: CreateTransactionInput = {
  transaction_id: 'TXN-001',
  transaction_date: new Date('2024-01-15'),
  customer_name: 'Test Customer',
  customer_address: 'Test Address 123',
  treasurer_principal_name: 'Test Treasurer',
  courier: 'Test Courier',
  additional_notes: 'Test notes',
  buyer_npwp: '123456789012345',
  service_value: 50000,
  service_type: 'Consultation',
  vat_enabled: true,
  local_tax_enabled: true,
  pph22_enabled: true,
  pph23_enabled: false
};

describe('getTransactionById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return transaction with correct numeric conversions', async () => {
    // Create test transaction
    const insertedTransaction = await db.insert(transactionsTable)
      .values({
        transaction_id: testTransactionInput.transaction_id,
        transaction_date: testTransactionInput.transaction_date,
        customer_name: testTransactionInput.customer_name,
        customer_address: testTransactionInput.customer_address,
        treasurer_principal_name: testTransactionInput.treasurer_principal_name,
        courier: testTransactionInput.courier,
        additional_notes: testTransactionInput.additional_notes,
        buyer_npwp: testTransactionInput.buyer_npwp,
        subtotal: '100000.00',
        vat_amount: '11000.00',
        local_tax_amount: '1000.00',
        pph22_amount: '2200.00',
        pph23_amount: '0.00',
        service_value: testTransactionInput.service_value?.toString(),
        service_type: testTransactionInput.service_type,
        stamp_duty_required: true,
        stamp_duty_amount: '10000.00',
        total_amount: '124200.00',
        vat_enabled: testTransactionInput.vat_enabled,
        local_tax_enabled: testTransactionInput.local_tax_enabled,
        pph22_enabled: testTransactionInput.pph22_enabled,
        pph23_enabled: testTransactionInput.pph23_enabled
      })
      .returning()
      .execute();

    const result = await getTransactionById(insertedTransaction[0].id);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(insertedTransaction[0].id);
    expect(result!.transaction_id).toBe('TXN-001');
    expect(result!.customer_name).toBe('Test Customer');
    expect(result!.customer_address).toBe('Test Address 123');
    expect(result!.treasurer_principal_name).toBe('Test Treasurer');
    
    // Verify numeric conversions
    expect(typeof result!.subtotal).toBe('number');
    expect(result!.subtotal).toBe(100000);
    expect(typeof result!.vat_amount).toBe('number');
    expect(result!.vat_amount).toBe(11000);
    expect(typeof result!.local_tax_amount).toBe('number');
    expect(result!.local_tax_amount).toBe(1000);
    expect(typeof result!.pph22_amount).toBe('number');
    expect(result!.pph22_amount).toBe(2200);
    expect(typeof result!.pph23_amount).toBe('number');
    expect(result!.pph23_amount).toBe(0);
    expect(typeof result!.stamp_duty_amount).toBe('number');
    expect(result!.stamp_duty_amount).toBe(10000);
    expect(typeof result!.total_amount).toBe('number');
    expect(result!.total_amount).toBe(124200);
    
    // Verify nullable service_value conversion
    expect(typeof result!.service_value).toBe('number');
    expect(result!.service_value).toBe(50000);
    
    // Verify boolean fields
    expect(result!.vat_enabled).toBe(true);
    expect(result!.local_tax_enabled).toBe(true);
    expect(result!.pph22_enabled).toBe(true);
    expect(result!.pph23_enabled).toBe(false);
    expect(result!.stamp_duty_required).toBe(true);
    
    // Verify timestamps
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent transaction', async () => {
    const result = await getTransactionById(999);

    expect(result).toBeNull();
  });

  it('should handle null service_value correctly', async () => {
    // Create transaction without service_value
    const insertedTransaction = await db.insert(transactionsTable)
      .values({
        transaction_id: 'TXN-002',
        transaction_date: new Date('2024-01-16'),
        customer_name: 'Test Customer 2',
        customer_address: 'Test Address 456',
        treasurer_principal_name: 'Test Treasurer 2',
        courier: null,
        additional_notes: null,
        buyer_npwp: null,
        subtotal: '50000.00',
        vat_amount: '5500.00',
        local_tax_amount: '500.00',
        pph22_amount: '1100.00',
        pph23_amount: '0.00',
        service_value: null,
        service_type: null,
        stamp_duty_required: false,
        stamp_duty_amount: '0.00',
        total_amount: '57100.00',
        vat_enabled: true,
        local_tax_enabled: true,
        pph22_enabled: true,
        pph23_enabled: false
      })
      .returning()
      .execute();

    const result = await getTransactionById(insertedTransaction[0].id);

    expect(result).not.toBeNull();
    expect(result!.service_value).toBeNull();
    expect(result!.service_type).toBeNull();
    expect(result!.courier).toBeNull();
    expect(result!.additional_notes).toBeNull();
    expect(result!.buyer_npwp).toBeNull();
    expect(result!.stamp_duty_required).toBe(false);
  });

  it('should return transaction with correct date handling', async () => {
    const testDate = new Date('2024-02-20T10:30:00Z');
    
    const insertedTransaction = await db.insert(transactionsTable)
      .values({
        transaction_id: 'TXN-DATE',
        transaction_date: testDate,
        customer_name: 'Date Test Customer',
        customer_address: 'Date Test Address',
        treasurer_principal_name: 'Date Test Treasurer',
        subtotal: '75000.00',
        vat_amount: '8250.00',
        local_tax_amount: '750.00',
        pph22_amount: '1650.00',
        pph23_amount: '0.00',
        stamp_duty_required: false,
        stamp_duty_amount: '0.00',
        total_amount: '85650.00',
        vat_enabled: true,
        local_tax_enabled: true,
        pph22_enabled: true,
        pph23_enabled: false
      })
      .returning()
      .execute();

    const result = await getTransactionById(insertedTransaction[0].id);

    expect(result).not.toBeNull();
    expect(result!.transaction_date).toBeInstanceOf(Date);
    expect(result!.transaction_date.getTime()).toBe(testDate.getTime());
  });
});
