
import { db } from '../db';
import { catalogItemsTable } from '../db/schema';
import { type UpdateCatalogItemInput, type CatalogItem } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateCatalogItem(input: UpdateCatalogItemInput): Promise<CatalogItem> {
  try {
    // Build update values object only with provided fields
    const updateValues: any = {
      updated_at: new Date()
    };

    if (input.item_code !== undefined) {
      updateValues.item_code = input.item_code;
    }
    if (input.item_name !== undefined) {
      updateValues.item_name = input.item_name;
    }
    if (input.type !== undefined) {
      updateValues.type = input.type;
    }
    if (input.unit_price !== undefined) {
      updateValues.unit_price = input.unit_price.toString();
    }
    if (input.description !== undefined) {
      updateValues.description = input.description;
    }

    // Update catalog item record
    const result = await db.update(catalogItemsTable)
      .set(updateValues)
      .where(eq(catalogItemsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Catalog item with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const catalogItem = result[0];
    return {
      ...catalogItem,
      unit_price: parseFloat(catalogItem.unit_price)
    };
  } catch (error) {
    console.error('Catalog item update failed:', error);
    throw error;
  }
}
