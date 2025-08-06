
import { db } from '../db';
import { catalogItemsTable } from '../db/schema';
import { type CatalogItem, type CatalogFilter } from '../schema';
import { eq, ilike, or, and, type SQL } from 'drizzle-orm';

export async function getCatalogItems(filter?: CatalogFilter): Promise<CatalogItem[]> {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (filter?.type) {
      conditions.push(eq(catalogItemsTable.type, filter.type));
    }

    if (filter?.search) {
      // Search in both item_name and item_code using case-insensitive matching
      conditions.push(
        or(
          ilike(catalogItemsTable.item_name, `%${filter.search}%`),
          ilike(catalogItemsTable.item_code, `%${filter.search}%`)
        )!
      );
    }

    // Execute query with or without conditions
    const results = conditions.length > 0
      ? await db.select()
          .from(catalogItemsTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .execute()
      : await db.select()
          .from(catalogItemsTable)
          .execute();

    // Convert numeric fields back to numbers
    return results.map(item => ({
      ...item,
      unit_price: parseFloat(item.unit_price)
    }));
  } catch (error) {
    console.error('Get catalog items failed:', error);
    throw error;
  }
}
