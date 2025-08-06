
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { storeProfilesTable } from '../db/schema';
import { type StoreProfileInput } from '../schema';
import { createStoreProfile } from '../handlers/create_store_profile';
import { eq } from 'drizzle-orm';

const testInput: StoreProfileInput = {
  store_name: 'Test Store',
  full_address: '123 Test Street, Test City, Test Province',
  phone_number: '+62-21-1234567',
  email: 'test@store.com',
  npwp: '12.345.678.9-012.345'
};

describe('createStoreProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a new store profile when none exists', async () => {
    const result = await createStoreProfile(testInput);

    // Verify returned data
    expect(result.store_name).toEqual('Test Store');
    expect(result.full_address).toEqual(testInput.full_address);
    expect(result.phone_number).toEqual(testInput.phone_number);
    expect(result.email).toEqual('test@store.com');
    expect(result.npwp).toEqual(testInput.npwp);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save store profile to database', async () => {
    const result = await createStoreProfile(testInput);

    // Verify data is in database
    const profiles = await db.select()
      .from(storeProfilesTable)
      .where(eq(storeProfilesTable.id, result.id))
      .execute();

    expect(profiles).toHaveLength(1);
    expect(profiles[0].store_name).toEqual('Test Store');
    expect(profiles[0].full_address).toEqual(testInput.full_address);
    expect(profiles[0].phone_number).toEqual(testInput.phone_number);
    expect(profiles[0].email).toEqual('test@store.com');
    expect(profiles[0].npwp).toEqual(testInput.npwp);
    expect(profiles[0].created_at).toBeInstanceOf(Date);
    expect(profiles[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update existing store profile when one already exists', async () => {
    // Create initial profile
    const initialResult = await createStoreProfile(testInput);
    const initialUpdatedAt = initialResult.updated_at;

    // Wait a small amount to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Update with new data
    const updateInput: StoreProfileInput = {
      store_name: 'Updated Store',
      full_address: '456 Updated Street, Updated City',
      phone_number: '+62-21-7654321',
      email: 'updated@store.com',
      npwp: '98.765.432.1-098.765'
    };

    const updatedResult = await createStoreProfile(updateInput);

    // Should have same ID but updated values
    expect(updatedResult.id).toEqual(initialResult.id);
    expect(updatedResult.store_name).toEqual('Updated Store');
    expect(updatedResult.full_address).toEqual(updateInput.full_address);
    expect(updatedResult.phone_number).toEqual(updateInput.phone_number);
    expect(updatedResult.email).toEqual('updated@store.com');
    expect(updatedResult.npwp).toEqual(updateInput.npwp);
    expect(updatedResult.updated_at.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
  });

  it('should only have one store profile in database after multiple operations', async () => {
    // Create initial profile
    await createStoreProfile(testInput);

    // Update profile multiple times
    const updateInput1: StoreProfileInput = {
      ...testInput,
      store_name: 'Updated Store 1'
    };
    await createStoreProfile(updateInput1);

    const updateInput2: StoreProfileInput = {
      ...testInput,
      store_name: 'Updated Store 2'
    };
    await createStoreProfile(updateInput2);

    // Verify only one profile exists
    const allProfiles = await db.select()
      .from(storeProfilesTable)
      .execute();

    expect(allProfiles).toHaveLength(1);
    expect(allProfiles[0].store_name).toEqual('Updated Store 2');
  });
});
