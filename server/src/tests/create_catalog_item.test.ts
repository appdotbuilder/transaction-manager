
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { catalogItemsTable } from '../db/schema';
import { type CreateCatalogItemInput } from '../schema';
import { createCatalogItem } from '../handlers/create_catalog_item';
import { eq } from 'drizzle-orm';

// Test inputs for different item types
const goodsInput: CreateCatalogItemInput = {
  item_code: 'GOODS001',
  item_name: 'Test Product',
  type: 'goods',
  unit_price: 25000.50,
  description: 'A test product for goods'
};

const serviceInput: CreateCatalogItemInput = {
  item_code: 'SERVICE001',
  item_name: 'Test Service',
  type: 'service',
  unit_price: 150000.00,
  description: 'A test service offering'
};

const minimalInput: CreateCatalogItemInput = {
  item_code: 'MIN001',
  item_name: 'Minimal Item',
  type: 'goods',
  unit_price: 1000,
  description: null
};

describe('createCatalogItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a goods catalog item', async () => {
    const result = await createCatalogItem(goodsInput);

    // Basic field validation
    expect(result.item_code).toEqual('GOODS001');
    expect(result.item_name).toEqual('Test Product');
    expect(result.type).toEqual('goods');
    expect(result.unit_price).toEqual(25000.50);
    expect(typeof result.unit_price).toBe('number');
    expect(result.description).toEqual('A test product for goods');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a service catalog item', async () => {
    const result = await createCatalogItem(serviceInput);

    expect(result.item_code).toEqual('SERVICE001');
    expect(result.item_name).toEqual('Test Service');
    expect(result.type).toEqual('service');
    expect(result.unit_price).toEqual(150000.00);
    expect(typeof result.unit_price).toBe('number');
    expect(result.description).toEqual('A test service offering');
  });

  it('should create catalog item with null description', async () => {
    const result = await createCatalogItem(minimalInput);

    expect(result.item_code).toEqual('MIN001');
    expect(result.item_name).toEqual('Minimal Item');
    expect(result.type).toEqual('goods');
    expect(result.unit_price).toEqual(1000);
    expect(result.description).toBeNull();
  });

  it('should save catalog item to database', async () => {
    const result = await createCatalogItem(goodsInput);

    // Query using proper drizzle syntax
    const catalogItems = await db.select()
      .from(catalogItemsTable)
      .where(eq(catalogItemsTable.id, result.id))
      .execute();

    expect(catalogItems).toHaveLength(1);
    expect(catalogItems[0].item_code).toEqual('GOODS001');
    expect(catalogItems[0].item_name).toEqual('Test Product');
    expect(catalogItems[0].type).toEqual('goods');
    expect(parseFloat(catalogItems[0].unit_price)).toEqual(25000.50);
    expect(catalogItems[0].description).toEqual('A test product for goods');
    expect(catalogItems[0].created_at).toBeInstanceOf(Date);
    expect(catalogItems[0].updated_at).toBeInstanceOf(Date);
  });

  it('should enforce unique item_code constraint', async () => {
    // Create first item successfully
    await createCatalogItem(goodsInput);

    // Attempt to create item with same code should fail
    const duplicateInput = {
      ...serviceInput,
      item_code: 'GOODS001' // Same code as first item
    };

    await expect(createCatalogItem(duplicateInput))
      .rejects.toThrow(/unique constraint|duplicate key/i);
  });

  it('should handle decimal prices correctly', async () => {
    const decimalInput: CreateCatalogItemInput = {
      item_code: 'DECIMAL001',
      item_name: 'Decimal Price Item',
      type: 'goods',
      unit_price: 99.99,
      description: 'Item with decimal price'
    };

    const result = await createCatalogItem(decimalInput);

    expect(result.unit_price).toEqual(99.99);
    expect(typeof result.unit_price).toBe('number');

    // Verify in database
    const saved = await db.select()
      .from(catalogItemsTable)
      .where(eq(catalogItemsTable.id, result.id))
      .execute();

    expect(parseFloat(saved[0].unit_price)).toEqual(99.99);
  });
});
