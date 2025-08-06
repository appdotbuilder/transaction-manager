
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { catalogItemsTable } from '../db/schema';
import { type CreateCatalogItemInput, type UpdateCatalogItemInput } from '../schema';
import { updateCatalogItem } from '../handlers/update_catalog_item';
import { eq } from 'drizzle-orm';

// Test input for creating initial catalog item
const createTestInput: CreateCatalogItemInput = {
  item_code: 'TEST001',
  item_name: 'Test Item',
  type: 'goods',
  unit_price: 100.00,
  description: 'A test item'
};

// Test input for updating catalog item
const updateTestInput: UpdateCatalogItemInput = {
  id: 1, // Will be set dynamically
  item_code: 'TEST002',
  item_name: 'Updated Test Item',
  type: 'service',
  unit_price: 150.00,
  description: 'An updated test item'
};

// Helper function to create a catalog item for testing
const createCatalogItem = async (input: CreateCatalogItemInput) => {
  const result = await db.insert(catalogItemsTable)
    .values({
      item_code: input.item_code,
      item_name: input.item_name,
      type: input.type,
      unit_price: input.unit_price.toString(),
      description: input.description
    })
    .returning()
    .execute();

  const catalogItem = result[0];
  return {
    ...catalogItem,
    unit_price: parseFloat(catalogItem.unit_price)
  };
};

describe('updateCatalogItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a catalog item with all fields', async () => {
    // Create initial catalog item
    const created = await createCatalogItem(createTestInput);
    
    // Update with new values
    const updateInput = { ...updateTestInput, id: created.id };
    const result = await updateCatalogItem(updateInput);

    // Verify updated fields
    expect(result.id).toEqual(created.id);
    expect(result.item_code).toEqual('TEST002');
    expect(result.item_name).toEqual('Updated Test Item');
    expect(result.type).toEqual('service');
    expect(result.unit_price).toEqual(150.00);
    expect(typeof result.unit_price).toEqual('number');
    expect(result.description).toEqual('An updated test item');
    expect(result.created_at).toEqual(created.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > created.updated_at).toBe(true);
  });

  it('should update catalog item partially', async () => {
    // Create initial catalog item
    const created = await createCatalogItem(createTestInput);
    
    // Update only name and price
    const partialUpdateInput: UpdateCatalogItemInput = {
      id: created.id,
      item_name: 'Partially Updated Item',
      unit_price: 75.50
    };
    
    const result = await updateCatalogItem(partialUpdateInput);

    // Verify updated fields
    expect(result.item_name).toEqual('Partially Updated Item');
    expect(result.unit_price).toEqual(75.50);
    expect(typeof result.unit_price).toEqual('number');
    
    // Verify unchanged fields
    expect(result.item_code).toEqual('TEST001');
    expect(result.type).toEqual('goods');
    expect(result.description).toEqual('A test item');
  });

  it('should save updated catalog item to database', async () => {
    // Create initial catalog item
    const created = await createCatalogItem(createTestInput);
    
    // Update catalog item
    const updateInput = { ...updateTestInput, id: created.id };
    const result = await updateCatalogItem(updateInput);

    // Query database to verify changes were persisted
    const items = await db.select()
      .from(catalogItemsTable)
      .where(eq(catalogItemsTable.id, result.id))
      .execute();

    expect(items).toHaveLength(1);
    expect(items[0].item_code).toEqual('TEST002');
    expect(items[0].item_name).toEqual('Updated Test Item');
    expect(items[0].type).toEqual('service');
    expect(parseFloat(items[0].unit_price)).toEqual(150.00);
    expect(items[0].description).toEqual('An updated test item');
    expect(items[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle null description update', async () => {
    // Create initial catalog item
    const created = await createCatalogItem(createTestInput);
    
    // Update description to null
    const updateInput: UpdateCatalogItemInput = {
      id: created.id,
      description: null
    };
    
    const result = await updateCatalogItem(updateInput);

    expect(result.description).toBeNull();
  });

  it('should throw error when catalog item not found', async () => {
    const updateInput: UpdateCatalogItemInput = {
      id: 999,
      item_name: 'Non-existent Item'
    };

    await expect(updateCatalogItem(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle unique constraint violation for item_code', async () => {
    // Create two catalog items
    const first = await createCatalogItem(createTestInput);
    const secondInput = { ...createTestInput, item_code: 'TEST003' };
    const second = await createCatalogItem(secondInput);

    // Try to update second item with first item's code
    const updateInput: UpdateCatalogItemInput = {
      id: second.id,
      item_code: 'TEST001' // This should conflict with first item
    };

    await expect(updateCatalogItem(updateInput)).rejects.toThrow();
  });
});
