
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type CreateTransactionInput } from '../schema';
import { createTransaction } from '../handlers/create_transaction';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateTransactionInput = {
  transaction_id: 'TXN-001',
  transaction_date: new Date('2024-01-15'),
  customer_name: 'PT. Test Customer',
  customer_address: 'Jl. Test Address No. 123, Jakarta',
  treasurer_principal_name: 'John Doe',
  courier: 'Express Delivery',
  additional_notes: 'Urgent delivery required',
  buyer_npwp: '12.345.678.9-012.000',
  service_value: 50000,
  service_type: 'Installation Service',
  vat_enabled: true,
  local_tax_enabled: true,
  pph22_enabled: true,
  pph23_enabled: false
};

describe('createTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a transaction with all fields', async () => {
    const result = await createTransaction(testInput);

    // Basic field validation
    expect(result.transaction_id).toEqual('TXN-001');
    expect(result.customer_name).toEqual('PT. Test Customer');
    expect(result.customer_address).toEqual(testInput.customer_address);
    expect(result.treasurer_principal_name).toEqual('John Doe');
    expect(result.courier).toEqual('Express Delivery');
    expect(result.additional_notes).toEqual('Urgent delivery required');
    expect(result.buyer_npwp).toEqual('12.345.678.9-012.000');
    expect(result.service_value).toEqual(50000);
    expect(result.service_type).toEqual('Installation Service');
    
    // Tax enablement flags
    expect(result.vat_enabled).toBe(true);
    expect(result.local_tax_enabled).toBe(true);
    expect(result.pph22_enabled).toBe(true);
    expect(result.pph23_enabled).toBe(false);
    
    // Initial financial values should be zero
    expect(result.subtotal).toEqual(0);
    expect(result.vat_amount).toEqual(0);
    expect(result.local_tax_amount).toEqual(0);
    expect(result.pph22_amount).toEqual(0);
    expect(result.pph23_amount).toEqual(0);
    expect(result.stamp_duty_amount).toEqual(0);
    expect(result.total_amount).toEqual(0);
    expect(result.stamp_duty_required).toBe(false);
    
    // Generated fields
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.transaction_date).toBeInstanceOf(Date);
  });

  it('should create transaction with minimal required fields', async () => {
    const minimalInput: CreateTransactionInput = {
      transaction_id: 'TXN-002',
      transaction_date: new Date('2024-01-16'),
      customer_name: 'Simple Customer',
      customer_address: 'Simple Address',
      treasurer_principal_name: 'Jane Smith',
      courier: null,
      additional_notes: null,
      buyer_npwp: null,
      service_value: null,
      service_type: null,
      vat_enabled: true,
      local_tax_enabled: true,
      pph22_enabled: true,
      pph23_enabled: false
    };

    const result = await createTransaction(minimalInput);

    expect(result.transaction_id).toEqual('TXN-002');
    expect(result.customer_name).toEqual('Simple Customer');
    expect(result.courier).toBeNull();
    expect(result.additional_notes).toBeNull();
    expect(result.buyer_npwp).toBeNull();
    expect(result.service_value).toBeNull();
    expect(result.service_type).toBeNull();
    expect(result.id).toBeDefined();
  });

  it('should save transaction to database', async () => {
    const result = await createTransaction(testInput);

    // Query database to verify transaction was saved
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    const dbTransaction = transactions[0];
    
    expect(dbTransaction.transaction_id).toEqual('TXN-001');
    expect(dbTransaction.customer_name).toEqual('PT. Test Customer');
    expect(parseFloat(dbTransaction.subtotal)).toEqual(0);
    expect(parseFloat(dbTransaction.service_value!)).toEqual(50000);
    expect(dbTransaction.vat_enabled).toBe(true);
    expect(dbTransaction.created_at).toBeInstanceOf(Date);
  });

  it('should verify numeric field types are correct', async () => {
    const result = await createTransaction(testInput);

    // Verify all numeric fields return as numbers, not strings
    expect(typeof result.subtotal).toBe('number');
    expect(typeof result.vat_amount).toBe('number');
    expect(typeof result.local_tax_amount).toBe('number');
    expect(typeof result.pph22_amount).toBe('number');
    expect(typeof result.pph23_amount).toBe('number');
    expect(typeof result.service_value).toBe('number');
    expect(typeof result.stamp_duty_amount).toBe('number');
    expect(typeof result.total_amount).toBe('number');
  });

  it('should throw error for duplicate transaction_id', async () => {
    // Create first transaction
    await createTransaction(testInput);

    // Attempt to create duplicate
    const duplicateInput = { ...testInput };
    
    await expect(createTransaction(duplicateInput)).rejects.toThrow(/already exists/i);
  });

  it('should handle date field correctly', async () => {
    const specificDate = new Date('2024-02-20T10:30:00Z');
    const inputWithDate = {
      ...testInput,
      transaction_id: 'TXN-003',
      transaction_date: specificDate
    };

    const result = await createTransaction(inputWithDate);

    expect(result.transaction_date).toBeInstanceOf(Date);
    expect(result.transaction_date.getTime()).toEqual(specificDate.getTime());
  });
});
