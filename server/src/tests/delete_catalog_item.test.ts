
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { catalogItemsTable, transactionsTable, transactionItemsTable } from '../db/schema';
import { type CreateCatalogItemInput, type CreateTransactionInput, type CreateTransactionItemInput } from '../schema';
import { deleteCatalogItem } from '../handlers/delete_catalog_item';
import { eq } from 'drizzle-orm';

// Test data
const testCatalogItem: CreateCatalogItemInput = {
  item_code: 'TEST001',
  item_name: 'Test Item',
  type: 'goods',
  unit_price: 100.00,
  description: 'Test description'
};

const testTransaction: CreateTransactionInput = {
  transaction_id: 'TXN001',
  transaction_date: new Date(),
  customer_name: 'Test Customer',
  customer_address: 'Test Address',
  treasurer_principal_name: 'Test Treasurer',
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

describe('deleteCatalogItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a catalog item successfully', async () => {
    // Create a catalog item
    const catalogResult = await db.insert(catalogItemsTable)
      .values({
        item_code: testCatalogItem.item_code,
        item_name: testCatalogItem.item_name,
        type: testCatalogItem.type,
        unit_price: testCatalogItem.unit_price.toString(),
        description: testCatalogItem.description
      })
      .returning()
      .execute();

    const catalogItemId = catalogResult[0].id;

    // Delete the catalog item
    await deleteCatalogItem(catalogItemId);

    // Verify item is deleted
    const deletedItem = await db.select()
      .from(catalogItemsTable)
      .where(eq(catalogItemsTable.id, catalogItemId))
      .execute();

    expect(deletedItem).toHaveLength(0);
  });

  it('should throw error when catalog item does not exist', async () => {
    const nonExistentId = 9999;

    await expect(deleteCatalogItem(nonExistentId)).rejects.toThrow(/catalog item with id 9999 not found/i);
  });

  it('should throw error when catalog item is used in transactions', async () => {
    // Create a catalog item
    const catalogResult = await db.insert(catalogItemsTable)
      .values({
        item_code: testCatalogItem.item_code,
        item_name: testCatalogItem.item_name,
        type: testCatalogItem.type,
        unit_price: testCatalogItem.unit_price.toString(),
        description: testCatalogItem.description
      })
      .returning()
      .execute();

    const catalogItemId = catalogResult[0].id;

    // Create a transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_id: testTransaction.transaction_id,
        transaction_date: testTransaction.transaction_date,
        customer_name: testTransaction.customer_name,
        customer_address: testTransaction.customer_address,
        treasurer_principal_name: testTransaction.treasurer_principal_name,
        courier: testTransaction.courier,
        additional_notes: testTransaction.additional_notes,
        buyer_npwp: testTransaction.buyer_npwp,
        subtotal: '100.00',
        vat_amount: '11.00',
        local_tax_amount: '1.00',
        pph22_amount: '0.00',
        pph23_amount: '0.00',
        service_value: testTransaction.service_value?.toString(),
        service_type: testTransaction.service_type,
        stamp_duty_required: false,
        stamp_duty_amount: '0.00',
        total_amount: '112.00',
        vat_enabled: testTransaction.vat_enabled,
        local_tax_enabled: testTransaction.local_tax_enabled,
        pph22_enabled: testTransaction.pph22_enabled,
        pph23_enabled: testTransaction.pph23_enabled
      })
      .returning()
      .execute();

    const transactionId = transactionResult[0].id;

    // Create a transaction item that references the catalog item
    await db.insert(transactionItemsTable)
      .values({
        transaction_id: transactionId,
        catalog_item_id: catalogItemId,
        item_code: testCatalogItem.item_code,
        item_name: testCatalogItem.item_name,
        quantity: '2.00',
        unit_price: testCatalogItem.unit_price.toString(),
        discount: '0.00',
        line_total: '200.00'
      })
      .execute();

    // Try to delete the catalog item
    await expect(deleteCatalogItem(catalogItemId)).rejects.toThrow(/cannot delete catalog item with id .* as it is referenced in .* transaction/i);

    // Verify catalog item still exists
    const existingItem = await db.select()
      .from(catalogItemsTable)
      .where(eq(catalogItemsTable.id, catalogItemId))
      .execute();

    expect(existingItem).toHaveLength(1);
    expect(existingItem[0].item_name).toEqual(testCatalogItem.item_name);
  });

  it('should allow deletion after removing transaction references', async () => {
    // Create a catalog item
    const catalogResult = await db.insert(catalogItemsTable)
      .values({
        item_code: testCatalogItem.item_code,
        item_name: testCatalogItem.item_name,
        type: testCatalogItem.type,
        unit_price: testCatalogItem.unit_price.toString(),
        description: testCatalogItem.description
      })
      .returning()
      .execute();

    const catalogItemId = catalogResult[0].id;

    // Create a transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_id: testTransaction.transaction_id,
        transaction_date: testTransaction.transaction_date,
        customer_name: testTransaction.customer_name,
        customer_address: testTransaction.customer_address,
        treasurer_principal_name: testTransaction.treasurer_principal_name,
        courier: testTransaction.courier,
        additional_notes: testTransaction.additional_notes,
        buyer_npwp: testTransaction.buyer_npwp,
        subtotal: '100.00',
        vat_amount: '11.00',
        local_tax_amount: '1.00',
        pph22_amount: '0.00',
        pph23_amount: '0.00',
        service_value: testTransaction.service_value?.toString(),
        service_type: testTransaction.service_type,
        stamp_duty_required: false,
        stamp_duty_amount: '0.00',
        total_amount: '112.00',
        vat_enabled: testTransaction.vat_enabled,
        local_tax_enabled: testTransaction.local_tax_enabled,
        pph22_enabled: testTransaction.pph22_enabled,
        pph23_enabled: testTransaction.pph23_enabled
      })
      .returning()
      .execute();

    const transactionId = transactionResult[0].id;

    // Create a transaction item
    const transactionItemResult = await db.insert(transactionItemsTable)
      .values({
        transaction_id: transactionId,
        catalog_item_id: catalogItemId,
        item_code: testCatalogItem.item_code,
        item_name: testCatalogItem.item_name,
        quantity: '1.00',
        unit_price: testCatalogItem.unit_price.toString(),
        discount: '0.00',
        line_total: '100.00'
      })
      .returning()
      .execute();

    // First deletion should fail
    await expect(deleteCatalogItem(catalogItemId)).rejects.toThrow(/cannot delete catalog item/i);

    // Remove the transaction item
    await db.delete(transactionItemsTable)
      .where(eq(transactionItemsTable.id, transactionItemResult[0].id))
      .execute();

    // Now deletion should succeed
    await deleteCatalogItem(catalogItemId);

    // Verify item is deleted
    const deletedItem = await db.select()
      .from(catalogItemsTable)
      .where(eq(catalogItemsTable.id, catalogItemId))
      .execute();

    expect(deletedItem).toHaveLength(0);
  });
});
