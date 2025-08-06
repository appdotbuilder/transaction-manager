
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { storeProfilesTable } from '../db/schema';
import { getStoreProfile } from '../handlers/get_store_profile';

describe('getStoreProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when no store profile exists', async () => {
    const result = await getStoreProfile();

    expect(result).toBeNull();
  });

  it('should return the store profile when it exists', async () => {
    // Create a test store profile
    const testProfile = {
      store_name: 'Test Store',
      full_address: '123 Test Street, Test City',
      phone_number: '+62-123-456-7890',
      email: 'test@store.com',
      npwp: '12.345.678.9-012.345'
    };

    await db.insert(storeProfilesTable)
      .values(testProfile)
      .execute();

    const result = await getStoreProfile();

    expect(result).not.toBeNull();
    expect(result!.store_name).toEqual('Test Store');
    expect(result!.full_address).toEqual('123 Test Street, Test City');
    expect(result!.phone_number).toEqual('+62-123-456-7890');
    expect(result!.email).toEqual('test@store.com');
    expect(result!.npwp).toEqual('12.345.678.9-012.345');
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return the first store profile when multiple exist', async () => {
    // Create two test store profiles
    const testProfile1 = {
      store_name: 'First Store',
      full_address: '123 First Street',
      phone_number: '+62-123-000-0001',
      email: 'first@store.com',
      npwp: '11.111.111.1-111.111'
    };

    const testProfile2 = {
      store_name: 'Second Store',
      full_address: '456 Second Street',
      phone_number: '+62-123-000-0002',
      email: 'second@store.com',
      npwp: '22.222.222.2-222.222'
    };

    await db.insert(storeProfilesTable)
      .values([testProfile1, testProfile2])
      .execute();

    const result = await getStoreProfile();

    expect(result).not.toBeNull();
    expect(result!.store_name).toEqual('First Store');
    expect(result!.email).toEqual('first@store.com');
  });
});
