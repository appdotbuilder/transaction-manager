
import { db } from '../db';
import { catalogItemsTable, transactionItemsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteCatalogItem = async (id: number): Promise<void> => {
  try {
    // Check if item exists first
    const existingItem = await db.select()
      .from(catalogItemsTable)
      .where(eq(catalogItemsTable.id, id))
      .execute();

    if (existingItem.length === 0) {
      throw new Error(`Catalog item with id ${id} not found`);
    }

    // Check if item is used in any transactions
    const transactionItems = await db.select()
      .from(transactionItemsTable)
      .where(eq(transactionItemsTable.catalog_item_id, id))
      .execute();

    if (transactionItems.length > 0) {
      throw new Error(`Cannot delete catalog item with id ${id} as it is referenced in ${transactionItems.length} transaction(s)`);
    }

    // Delete the catalog item
    await db.delete(catalogItemsTable)
      .where(eq(catalogItemsTable.id, id))
      .execute();
  } catch (error) {
    console.error('Catalog item deletion failed:', error);
    throw error;
  }
};
