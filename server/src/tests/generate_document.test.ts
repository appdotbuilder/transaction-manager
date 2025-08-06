
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { storeProfilesTable, catalogItemsTable, transactionsTable, transactionItemsTable } from '../db/schema';
import { type GenerateDocumentInput } from '../schema';
import { generateDocument } from '../handlers/generate_document';

// Test data
const testStoreProfile = {
  store_name: 'Test Store',
  full_address: '123 Test Street, Jakarta',
  phone_number: '+62-21-12345678',
  email: 'test@store.com',
  npwp: '12.345.678.9-012.000'
};

const testCatalogItem = {
  item_code: 'TEST001',
  item_name: 'Test Product',
  type: 'goods' as const,
  unit_price: '100000.00',
  description: 'Test product description'
};

const testTransaction = {
  transaction_id: 'TXN001',
  transaction_date: new Date('2024-01-15'),
  customer_name: 'Test Customer',
  customer_address: '456 Customer Street, Jakarta',
  treasurer_principal_name: 'Test Treasurer',
  courier: 'Test Courier',
  additional_notes: 'Test notes',
  buyer_npwp: '98.765.432.1-098.000',
  subtotal: '100000.00',
  vat_amount: '11000.00',
  local_tax_amount: '1000.00',
  pph22_amount: '2200.00',
  pph23_amount: '2000.00',
  service_value: null,
  service_type: null,
  stamp_duty_required: false,
  stamp_duty_amount: '0.00',
  total_amount: '113000.00',
  vat_enabled: true,
  local_tax_enabled: true,
  pph22_enabled: true,
  pph23_enabled: true
};

const testTransactionItem = {
  item_code: 'TEST001',
  item_name: 'Test Product',
  quantity: '2.00',
  unit_price: '50000.00',
  discount: '0.00',
  line_total: '100000.00'
};

describe('generateDocument', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let storeProfileId: number;
  let catalogItemId: number;
  let transactionId: number;

  beforeEach(async () => {
    // Create test store profile
    const storeResult = await db.insert(storeProfilesTable)
      .values(testStoreProfile)
      .returning()
      .execute();
    storeProfileId = storeResult[0].id;

    // Create test catalog item
    const catalogResult = await db.insert(catalogItemsTable)
      .values(testCatalogItem)
      .returning()
      .execute();
    catalogItemId = catalogResult[0].id;

    // Create test transaction
    const transactionResult = await db.insert(transactionsTable)
      .values(testTransaction)
      .returning()
      .execute();
    transactionId = transactionResult[0].id;

    // Create test transaction item
    await db.insert(transactionItemsTable)
      .values({
        ...testTransactionItem,
        transaction_id: transactionId,
        catalog_item_id: catalogItemId
      })
      .execute();
  });

  it('should generate sales note document', async () => {
    const input: GenerateDocumentInput = {
      transaction_id: transactionId,
      document_type: 'sales_note'
    };

    const result = await generateDocument(input);

    expect(result).toContain('SALES NOTE');
    expect(result).toContain('Test Store');
    expect(result).toContain('TXN001');
    expect(result).toContain('Test Customer');
    expect(result).toContain('TEST001');
    expect(result).toContain('Test Product');
    expect(result).toContain('100,000');
    expect(result).toContain('113,000');
  });

  it('should generate payment receipt document', async () => {
    const input: GenerateDocumentInput = {
      transaction_id: transactionId,
      document_type: 'payment_receipt',
      city_regency: 'Bandung'
    };

    const result = await generateDocument(input);

    expect(result).toContain('PAYMENT RECEIPT');
    expect(result).toContain('Test Customer');
    expect(result).toContain('113,000');
    expect(result).toContain('TXN001');
    expect(result).toContain('Test Treasurer');
    expect(result).toContain('Bandung');
  });

  it('should generate invoice document', async () => {
    const input: GenerateDocumentInput = {
      transaction_id: transactionId,
      document_type: 'invoice'
    };

    const result = await generateDocument(input);

    expect(result).toContain('INVOICE');
    expect(result).toContain('NPWP: 12.345.678.9-012.000');
    expect(result).toContain('Bill To');
    expect(result).toContain('Test Customer');
    expect(result).toContain('TEST001');
    expect(result).toContain('VAT');
    expect(result).toContain('11,000');
  });

  it('should generate BAST document', async () => {
    const input: GenerateDocumentInput = {
      transaction_id: transactionId,
      document_type: 'bast',
      bast_recipient: 'Custom Recipient',
      courier_name: 'Custom Courier'
    };

    const result = await generateDocument(input);

    expect(result).toContain('BERITA ACARA SERAH TERIMA');
    expect(result).toContain('Custom Recipient');
    expect(result).toContain('Custom Courier');
    expect(result).toContain('Test Product');
    expect(result).toContain('Good condition');
    expect(result).toContain('Delivered by');
    expect(result).toContain('Received by');
  });

  it('should generate purchase order document', async () => {
    const input: GenerateDocumentInput = {
      transaction_id: transactionId,
      document_type: 'purchase_order'
    };

    const result = await generateDocument(input);

    expect(result).toContain('PURCHASE ORDER');
    expect(result).toContain('PO Number');
    expect(result).toContain('Vendor');
    expect(result).toContain('Test Customer');
    expect(result).toContain('Authorized by: Test Treasurer');
  });

  it('should generate tax invoice document', async () => {
    const input: GenerateDocumentInput = {
      transaction_id: transactionId,
      document_type: 'tax_invoice'
    };

    const result = await generateDocument(input);

    expect(result).toContain('FAKTUR PAJAK');
    expect(result).toContain('Customer NPWP');
    expect(result).toContain('98.765.432.1-098.000');
    expect(result).toContain('Subtotal (DPP)');
    expect(result).toContain('VAT (11%)');
    expect(result).toContain('PPh 22');
    expect(result).toContain('PPh 23');
  });

  it('should generate proforma invoice document', async () => {
    const input: GenerateDocumentInput = {
      transaction_id: transactionId,
      document_type: 'proforma_invoice'
    };

    const result = await generateDocument(input);

    expect(result).toContain('PROFORMA INVOICE');
    expect(result).toContain('PROFORMA - NOT FOR PAYMENT');
    expect(result).toContain('Proforma No');
    expect(result).toContain('Estimated Total');
    expect(result).toContain('quotation purposes only');
  });

  it('should use custom document date when provided', async () => {
    const customDate = new Date('2024-02-20');
    const input: GenerateDocumentInput = {
      transaction_id: transactionId,
      document_type: 'sales_note',
      document_date: customDate
    };

    const result = await generateDocument(input);

    expect(result).toContain('20/2/2024');
  });

  it('should throw error for non-existent transaction', async () => {
    const input: GenerateDocumentInput = {
      transaction_id: 99999,
      document_type: 'sales_note'
    };

    expect(generateDocument(input)).rejects.toThrow(/Transaction not found/i);
  });

  it('should throw error for unsupported document type', async () => {
    const input = {
      transaction_id: transactionId,
      document_type: 'unsupported_type'
    } as any;

    expect(generateDocument(input)).rejects.toThrow(/Unsupported document type/i);
  });

  it('should handle transaction without items', async () => {
    // Create transaction without items
    const emptyTransactionResult = await db.insert(transactionsTable)
      .values({
        ...testTransaction,
        transaction_id: 'EMPTY001'
      })
      .returning()
      .execute();

    const input: GenerateDocumentInput = {
      transaction_id: emptyTransactionResult[0].id,
      document_type: 'sales_note'
    };

    const result = await generateDocument(input);

    expect(result).toContain('SALES NOTE');
    expect(result).toContain('EMPTY001');
    // Should not have any item rows
    expect(result).not.toContain('TEST001');
  });

  it('should work without store profile', async () => {
    // Delete store profile
    await db.delete(storeProfilesTable).execute();

    const input: GenerateDocumentInput = {
      transaction_id: transactionId,
      document_type: 'sales_note'
    };

    const result = await generateDocument(input);

    expect(result).toContain('SALES NOTE');
    expect(result).toContain('TXN001');
    // Should not contain store name
    expect(result).not.toContain('Test Store');
  });

  it('should handle numeric conversions correctly', async () => {
    const input: GenerateDocumentInput = {
      transaction_id: transactionId,
      document_type: 'invoice'
    };

    const result = await generateDocument(input);

    // Check that numeric values are properly formatted
    expect(result).toContain('50,000'); // unit price
    expect(result).toContain('100,000'); // subtotal
    expect(result).toContain('11,000'); // VAT
    expect(result).toContain('113,000'); // total
  });
});
