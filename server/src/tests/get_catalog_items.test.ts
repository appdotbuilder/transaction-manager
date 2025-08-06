
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { catalogItemsTable } from '../db/schema';
import { type CatalogFilter } from '../schema';
import { getCatalogItems } from '../handlers/get_catalog_items';

// Test data setup
const testItems = [
  {
    item_code: 'GOODS001',
    item_name: 'Laptop Computer',
    type: 'goods' as const,
    unit_price: '1500.00',
    description: 'High-performance laptop'
  },
  {
    item_code: 'SERV001',
    item_name: 'IT Consultation',
    type: 'service' as const,
    unit_price: '100.00',
    description: 'Professional IT consulting service'
  },
  {
    item_code: 'GOODS002',
    item_name: 'Office Chair',
    type: 'goods' as const,
    unit_price: '250.50',
    description: null
  }
];

describe('getCatalogItems', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all catalog items without filter', async () => {
    // Insert test data
    await db.insert(catalogItemsTable).values(testItems).execute();

    const result = await getCatalogItems();

    expect(result).toHaveLength(3);
    
    // Verify numeric conversion
    expect(typeof result[0].unit_price).toBe('number');
    expect(result[0].unit_price).toBe(1500.00);
    
    // Verify all items are present
    const codes = result.map(item => item.item_code);
    expect(codes).toContain('GOODS001');
    expect(codes).toContain('SERV001');
    expect(codes).toContain('GOODS002');
  });

  it('should filter by type correctly', async () => {
    // Insert test data
    await db.insert(catalogItemsTable).values(testItems).execute();

    const filter: CatalogFilter = { type: 'goods' };
    const result = await getCatalogItems(filter);

    expect(result).toHaveLength(2);
    result.forEach(item => {
      expect(item.type).toBe('goods');
    });
    
    // Verify specific items
    const codes = result.map(item => item.item_code);
    expect(codes).toContain('GOODS001');
    expect(codes).toContain('GOODS002');
    expect(codes).not.toContain('SERV001');
  });

  it('should search by item name', async () => {
    // Insert test data
    await db.insert(catalogItemsTable).values(testItems).execute();

    const filter: CatalogFilter = { search: 'laptop' };
    const result = await getCatalogItems(filter);

    expect(result).toHaveLength(1);
    expect(result[0].item_name).toBe('Laptop Computer');
    expect(result[0].item_code).toBe('GOODS001');
    expect(typeof result[0].unit_price).toBe('number');
    expect(result[0].unit_price).toBe(1500.00);
  });

  it('should search by item code', async () => {
    // Insert test data
    await db.insert(catalogItemsTable).values(testItems).execute();

    const filter: CatalogFilter = { search: 'SERV' };
    const result = await getCatalogItems(filter);

    expect(result).toHaveLength(1);
    expect(result[0].item_code).toBe('SERV001');
    expect(result[0].item_name).toBe('IT Consultation');
    expect(typeof result[0].unit_price).toBe('number');
    expect(result[0].unit_price).toBe(100.00);
  });

  it('should combine type and search filters', async () => {
    // Insert test data
    await db.insert(catalogItemsTable).values(testItems).execute();

    const filter: CatalogFilter = { 
      type: 'goods',
      search: 'chair'
    };
    const result = await getCatalogItems(filter);

    expect(result).toHaveLength(1);
    expect(result[0].item_code).toBe('GOODS002');
    expect(result[0].item_name).toBe('Office Chair');
    expect(result[0].type).toBe('goods');
    expect(typeof result[0].unit_price).toBe('number');
    expect(result[0].unit_price).toBe(250.50);
  });

  it('should return empty array when no matches found', async () => {
    // Insert test data
    await db.insert(catalogItemsTable).values(testItems).execute();

    const filter: CatalogFilter = { search: 'nonexistent' };
    const result = await getCatalogItems(filter);

    expect(result).toHaveLength(0);
  });

  it('should perform case-insensitive search', async () => {
    // Insert test data
    await db.insert(catalogItemsTable).values(testItems).execute();

    const filter: CatalogFilter = { search: 'LAPTOP' };
    const result = await getCatalogItems(filter);

    expect(result).toHaveLength(1);
    expect(result[0].item_name).toBe('Laptop Computer');
  });

  it('should handle empty database', async () => {
    const result = await getCatalogItems();
    expect(result).toHaveLength(0);
  });
});
