
import { db } from '../db';
import { storeProfilesTable } from '../db/schema';
import { type StoreProfileInput, type StoreProfile } from '../schema';
import { eq } from 'drizzle-orm';

export async function createStoreProfile(input: StoreProfileInput): Promise<StoreProfile> {
  try {
    // Check if a store profile already exists (there should only be one)
    const existing = await db.select()
      .from(storeProfilesTable)
      .limit(1)
      .execute();

    if (existing.length > 0) {
      // Update existing profile
      const result = await db.update(storeProfilesTable)
        .set({
          store_name: input.store_name,
          full_address: input.full_address,
          phone_number: input.phone_number,
          email: input.email,
          npwp: input.npwp,
          updated_at: new Date()
        })
        .where(eq(storeProfilesTable.id, existing[0].id))
        .returning()
        .execute();

      return result[0];
    } else {
      // Create new profile
      const result = await db.insert(storeProfilesTable)
        .values({
          store_name: input.store_name,
          full_address: input.full_address,
          phone_number: input.phone_number,
          email: input.email,
          npwp: input.npwp
        })
        .returning()
        .execute();

      return result[0];
    }
  } catch (error) {
    console.error('Store profile creation/update failed:', error);
    throw error;
  }
}
