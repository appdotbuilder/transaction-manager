
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type TransactionFilter } from '../schema';
import { getTransactions } from '../handlers/get_transactions';

// Test transaction data
const testTransaction1 = {
  transaction_id: 'TXN-001',
  transaction_date: new Date('2024-01-15'),
  customer_name: 'Test Customer 1',
  customer_address: '123 Test St',
  treasurer_principal_name: 'John Doe',
  courier: 'Express Delivery',
  additional_notes: 'Urgent delivery',
  buyer_npwp: '123456789',
  subtotal: '100.00',
  vat_amount: '11.00',
  local_tax_amount: '1.00',
  pph22_amount: '2.00',
  pph23_amount: '3.00',
  service_value: '10.00',
  service_type: 'Installation',
  stamp_duty_required: true,
  stamp_duty_amount: '10.00',
  total_amount: '137.00',
  vat_enabled: true,
  local_tax_enabled: true,
  pph22_enabled: true,
  pph23_enabled: false
};

const testTransaction2 = {
  transaction_id: 'TXN-002',
  transaction_date: new Date('2024-01-20'),
  customer_name: 'Another Customer',
  customer_address: '456 Another St',
  treasurer_principal_name: 'Jane Smith',
  courier: null,
  additional_notes: null,
  buyer_npwp: null,
  subtotal: '200.00',
  vat_amount: '22.00',
  local_tax_amount: '2.00',
  pph22_amount: '4.00',
  pph23_amount: '6.00',
  service_value: null,
  service_type: null,
  stamp_duty_required: false,
  stamp_duty_amount: '0.00',
  total_amount: '234.00',
  vat_enabled: true,
  local_tax_enabled: true,
  pph22_enabled: true,
  pph23_enabled: true
};

describe('getTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no transactions exist', async () => {
    const result = await getTransactions();
    expect(result).toEqual([]);
  });

  it('should return all transactions without filter', async () => {
    // Create test transactions
    await db.insert(transactionsTable).values([testTransaction1, testTransaction2]).execute();

    const result = await getTransactions();

    expect(result).toHaveLength(2);
    
    // Find specific transactions to verify data
    const txn1 = result.find(t => t.transaction_id === 'TXN-001');
    const txn2 = result.find(t => t.transaction_id === 'TXN-002');
    
    expect(txn1).toBeDefined();
    expect(txn2).toBeDefined();
    
    // Verify numeric conversions for txn1
    expect(typeof txn1!.subtotal).toBe('number');
    expect(typeof txn1!.vat_amount).toBe('number');
    expect(typeof txn1!.total_amount).toBe('number');
    expect(txn1!.service_value).toBe(10);
    expect(txn1!.subtotal).toBe(100);
    expect(txn1!.total_amount).toBe(137);

    // Verify numeric conversions for txn2
    expect(typeof txn2!.subtotal).toBe('number');
    expect(typeof txn2!.vat_amount).toBe('number');
    expect(typeof txn2!.total_amount).toBe('number');
    expect(txn2!.service_value).toBe(null);
    expect(txn2!.subtotal).toBe(200);
    expect(txn2!.total_amount).toBe(234);
  });

  it('should filter by start date', async () => {
    await db.insert(transactionsTable).values([testTransaction1, testTransaction2]).execute();

    const filter: TransactionFilter = {
      start_date: new Date('2024-01-18')
    };

    const result = await getTransactions(filter);

    expect(result).toHaveLength(1);
    expect(result[0].transaction_id).toBe('TXN-002');
  });

  it('should filter by end date', async () => {
    await db.insert(transactionsTable).values([testTransaction1, testTransaction2]).execute();

    const filter: TransactionFilter = {
      end_date: new Date('2024-01-18')
    };

    const result = await getTransactions(filter);

    expect(result).toHaveLength(1);
    expect(result[0].transaction_id).toBe('TXN-001');
  });

  it('should filter by date range', async () => {
    await db.insert(transactionsTable).values([testTransaction1, testTransaction2]).execute();

    const filter: TransactionFilter = {
      start_date: new Date('2024-01-14'),
      end_date: new Date('2024-01-16')
    };

    const result = await getTransactions(filter);

    expect(result).toHaveLength(1);
    expect(result[0].transaction_id).toBe('TXN-001');
  });

  it('should filter by customer name (case insensitive)', async () => {
    await db.insert(transactionsTable).values([testTransaction1, testTransaction2]).execute();

    const filter: TransactionFilter = {
      customer_name: 'test customer'
    };

    const result = await getTransactions(filter);

    expect(result).toHaveLength(1);
    expect(result[0].transaction_id).toBe('TXN-001');
  });

  it('should filter by partial customer name', async () => {
    await db.insert(transactionsTable).values([testTransaction1, testTransaction2]).execute();

    const filter: TransactionFilter = {
      customer_name: 'another'
    };

    const result = await getTransactions(filter);

    expect(result).toHaveLength(1);
    expect(result[0].transaction_id).toBe('TXN-002');
  });

  it('should apply multiple filters', async () => {
    await db.insert(transactionsTable).values([testTransaction1, testTransaction2]).execute();

    const filter: TransactionFilter = {
      start_date: new Date('2024-01-10'),
      end_date: new Date('2024-01-25'),
      customer_name: 'test'
    };

    const result = await getTransactions(filter);

    expect(result).toHaveLength(1);
    expect(result[0].transaction_id).toBe('TXN-001');
  });

  it('should return empty array when no transactions match filters', async () => {
    await db.insert(transactionsTable).values([testTransaction1, testTransaction2]).execute();

    const filter: TransactionFilter = {
      customer_name: 'nonexistent customer'
    };

    const result = await getTransactions(filter);

    expect(result).toEqual([]);
  });
});
