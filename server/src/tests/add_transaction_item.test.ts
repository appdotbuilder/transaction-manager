
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { catalogItemsTable, transactionsTable, transactionItemsTable } from '../db/schema';
import { type CreateTransactionItemInput } from '../schema';
import { addTransactionItem } from '../handlers/add_transaction_item';
import { eq } from 'drizzle-orm';

describe('addTransactionItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let catalogItemId: number;
  let transactionId: number;

  beforeEach(async () => {
    // Create test catalog item
    const catalogResult = await db.insert(catalogItemsTable)
      .values({
        item_code: 'TEST001',
        item_name: 'Test Product',
        type: 'goods',
        unit_price: '100000',
        description: 'Test product description'
      })
      .returning()
      .execute();

    catalogItemId = catalogResult[0].id;

    // Create test transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_id: 'TXN001',
        transaction_date: new Date(),
        customer_name: 'Test Customer',
        customer_address: 'Test Address',
        treasurer_principal_name: 'Test Treasurer',
        subtotal: '0',
        vat_amount: '0',
        local_tax_amount: '0',
        pph22_amount: '0',
        pph23_amount: '0',
        stamp_duty_required: false,
        stamp_duty_amount: '0',
        total_amount: '0',
        vat_enabled: true,
        local_tax_enabled: true,
        pph22_enabled: true,
        pph23_enabled: false
      })
      .returning()
      .execute();

    transactionId = transactionResult[0].id;
  });

  const testInput: CreateTransactionItemInput = {
    transaction_id: 0, // Will be set in tests
    catalog_item_id: 0, // Will be set in tests
    quantity: 2,
    unit_price: 100000,
    discount: 10
  };

  it('should add transaction item with catalog details', async () => {
    const input = {
      ...testInput,
      transaction_id: transactionId,
      catalog_item_id: catalogItemId
    };

    const result = await addTransactionItem(input);

    expect(result.transaction_id).toEqual(transactionId);
    expect(result.catalog_item_id).toEqual(catalogItemId);
    expect(result.item_code).toEqual('TEST001');
    expect(result.item_name).toEqual('Test Product');
    expect(result.quantity).toEqual(2);
    expect(result.unit_price).toEqual(100000);
    expect(result.discount).toEqual(10);
    expect(result.line_total).toEqual(180000); // 2 * 100000 * 0.9 = 180000
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save transaction item to database', async () => {
    const input = {
      ...testInput,
      transaction_id: transactionId,
      catalog_item_id: catalogItemId
    };

    const result = await addTransactionItem(input);

    const items = await db.select()
      .from(transactionItemsTable)
      .where(eq(transactionItemsTable.id, result.id))
      .execute();

    expect(items).toHaveLength(1);
    expect(items[0].item_code).toEqual('TEST001');
    expect(items[0].item_name).toEqual('Test Product');
    expect(parseFloat(items[0].line_total)).toEqual(180000);
  });

  it('should recalculate transaction totals', async () => {
    const input = {
      ...testInput,
      transaction_id: transactionId,
      catalog_item_id: catalogItemId
    };

    await addTransactionItem(input);

    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    const transaction = transactions[0];
    const subtotal = parseFloat(transaction.subtotal);
    const vatAmount = parseFloat(transaction.vat_amount);
    const localTaxAmount = parseFloat(transaction.local_tax_amount);
    const pph22Amount = parseFloat(transaction.pph22_amount);
    const totalAmount = parseFloat(transaction.total_amount);

    expect(subtotal).toEqual(180000);
    expect(vatAmount).toEqual(19800); // 180000 * 0.11
    expect(localTaxAmount).toEqual(1800); // 180000 * 0.01
    expect(pph22Amount).toEqual(2700); // 180000 * 0.015
    expect(totalAmount).toEqual(204300); // 180000 + 19800 + 1800 + 2700
  });

  it('should calculate line total with discount correctly', async () => {
    const input = {
      ...testInput,
      transaction_id: transactionId,
      catalog_item_id: catalogItemId,
      quantity: 3,
      unit_price: 50000,
      discount: 20
    };

    const result = await addTransactionItem(input);

    // 3 * 50000 * (1 - 20/100) = 120000
    expect(result.line_total).toEqual(120000);
  });

  it('should set stamp duty when total exceeds threshold', async () => {
    // Create high-value catalog item
    const highValueResult = await db.insert(catalogItemsTable)
      .values({
        item_code: 'HIGH001',
        item_name: 'High Value Item',
        type: 'goods',
        unit_price: '5000000',
        description: 'High value item'
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      transaction_id: transactionId,
      catalog_item_id: highValueResult[0].id,
      quantity: 1,
      unit_price: 5000000,
      discount: 0
    };

    await addTransactionItem(input);

    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    const transaction = transactions[0];
    expect(transaction.stamp_duty_required).toBe(true);
    expect(parseFloat(transaction.stamp_duty_amount)).toEqual(10000);
  });

  it('should throw error for non-existent transaction', async () => {
    const input = {
      ...testInput,
      transaction_id: 99999,
      catalog_item_id: catalogItemId
    };

    await expect(addTransactionItem(input)).rejects.toThrow(/Transaction with id 99999 not found/i);
  });

  it('should throw error for non-existent catalog item', async () => {
    const input = {
      ...testInput,
      transaction_id: transactionId,
      catalog_item_id: 99999
    };

    await expect(addTransactionItem(input)).rejects.toThrow(/Catalog item with id 99999 not found/i);
  });
});
