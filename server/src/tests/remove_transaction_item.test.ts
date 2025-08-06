
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { catalogItemsTable, transactionsTable, transactionItemsTable } from '../db/schema';
import { removeTransactionItem } from '../handlers/remove_transaction_item';
import { eq } from 'drizzle-orm';

describe('removeTransactionItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let catalogItemId: number;
  let transactionId: number;
  let transactionItemId: number;

  beforeEach(async () => {
    // Create a catalog item
    const catalogItems = await db.insert(catalogItemsTable)
      .values({
        item_code: 'TEST001',
        item_name: 'Test Item',
        type: 'goods',
        unit_price: '100.00',
        description: 'Test item for testing'
      })
      .returning()
      .execute();
    
    catalogItemId = catalogItems[0].id;

    // Create a transaction
    const transactions = await db.insert(transactionsTable)
      .values({
        transaction_id: 'TRX001',
        transaction_date: new Date(),
        customer_name: 'Test Customer',
        customer_address: 'Test Address',
        treasurer_principal_name: 'Test Treasurer',
        subtotal: '1000.00',
        vat_amount: '110.00',
        local_tax_amount: '10.00',
        pph22_amount: '15.00',
        pph23_amount: '0.00',
        service_value: null,
        service_type: null,
        stamp_duty_required: false,
        stamp_duty_amount: '0.00',
        total_amount: '1135.00',
        vat_enabled: true,
        local_tax_enabled: true,
        pph22_enabled: true,
        pph23_enabled: false
      })
      .returning()
      .execute();
    
    transactionId = transactions[0].id;

    // Create transaction items
    const transactionItems = await db.insert(transactionItemsTable)
      .values([
        {
          transaction_id: transactionId,
          catalog_item_id: catalogItemId,
          item_code: 'TEST001',
          item_name: 'Test Item',
          quantity: '5.00',
          unit_price: '100.00',
          discount: '0.00',
          line_total: '500.00'
        },
        {
          transaction_id: transactionId,
          catalog_item_id: catalogItemId,
          item_code: 'TEST001',
          item_name: 'Test Item',
          quantity: '5.00',
          unit_price: '100.00',
          discount: '0.00',
          line_total: '500.00'
        }
      ])
      .returning()
      .execute();
    
    transactionItemId = transactionItems[0].id;
  });

  it('should remove transaction item successfully', async () => {
    await removeTransactionItem(transactionItemId);

    // Verify item is removed
    const remainingItems = await db.select()
      .from(transactionItemsTable)
      .where(eq(transactionItemsTable.id, transactionItemId))
      .execute();

    expect(remainingItems).toHaveLength(0);
  });

  it('should recalculate transaction totals after removing item', async () => {
    await removeTransactionItem(transactionItemId);

    // Get updated transaction
    const updatedTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    const updatedTransaction = updatedTransactions[0];

    // With one item removed (500.00), subtotal should be 500.00
    expect(parseFloat(updatedTransaction.subtotal)).toEqual(500.00);
    expect(parseFloat(updatedTransaction.vat_amount)).toEqual(55.00); // 500 * 0.11
    expect(parseFloat(updatedTransaction.local_tax_amount)).toEqual(5.00); // 500 * 0.01
    expect(parseFloat(updatedTransaction.pph22_amount)).toEqual(7.50); // 500 * 0.015
    expect(parseFloat(updatedTransaction.pph23_amount)).toEqual(0.00);
    expect(updatedTransaction.stamp_duty_required).toBe(false);
    expect(parseFloat(updatedTransaction.stamp_duty_amount)).toEqual(0.00);
    expect(parseFloat(updatedTransaction.total_amount)).toEqual(567.50); // 500 + 55 + 5 + 7.5
  });

  it('should update stamp duty when total crosses threshold', async () => {
    // Create high-value transaction items that will cross stamp duty threshold
    await db.delete(transactionItemsTable)
      .where(eq(transactionItemsTable.transaction_id, transactionId))
      .execute();

    const highValueItems = await db.insert(transactionItemsTable)
      .values([
        {
          transaction_id: transactionId,
          catalog_item_id: catalogItemId,
          item_code: 'TEST001',
          item_name: 'Test Item',
          quantity: '1.00',
          unit_price: '5000000.00',
          discount: '0.00',
          line_total: '5000000.00'
        },
        {
          transaction_id: transactionId,
          catalog_item_id: catalogItemId,
          item_code: 'TEST001',
          item_name: 'Test Item',
          quantity: '1.00',
          unit_price: '100.00',
          discount: '0.00',
          line_total: '100.00'
        }
      ])
      .returning()
      .execute();

    // Remove the high-value item, should disable stamp duty
    await removeTransactionItem(highValueItems[0].id);

    const updatedTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    const updatedTransaction = updatedTransactions[0];

    // Should have stamp duty disabled since total is now below threshold
    expect(updatedTransaction.stamp_duty_required).toBe(false);
    expect(parseFloat(updatedTransaction.stamp_duty_amount)).toEqual(0.00);
  });

  it('should handle PPH23 calculation with service value', async () => {
    // Update transaction to have service value and enable PPH23
    await db.update(transactionsTable)
      .set({
        service_value: '1000.00',
        service_type: 'Consulting',
        pph23_enabled: true
      })
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    await removeTransactionItem(transactionItemId);

    const updatedTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    const updatedTransaction = updatedTransactions[0];

    // PPH23 should be calculated from service value (1000 * 0.02 = 20)
    expect(parseFloat(updatedTransaction.pph23_amount)).toEqual(20.00);
  });

  it('should throw error for non-existent transaction item', async () => {
    expect(removeTransactionItem(99999)).rejects.toThrow(/transaction item not found/i);
  });

  it('should handle removing all items from transaction', async () => {
    // Remove all items
    const allItems = await db.select()
      .from(transactionItemsTable)
      .where(eq(transactionItemsTable.transaction_id, transactionId))
      .execute();

    for (const item of allItems) {
      await removeTransactionItem(item.id);
    }

    // Check final transaction state
    const updatedTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    const updatedTransaction = updatedTransactions[0];

    expect(parseFloat(updatedTransaction.subtotal)).toEqual(0.00);
    expect(parseFloat(updatedTransaction.total_amount)).toEqual(0.00);
    expect(updatedTransaction.stamp_duty_required).toBe(false);
  });
});
