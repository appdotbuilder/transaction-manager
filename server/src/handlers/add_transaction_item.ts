
import { db } from '../db';
import { catalogItemsTable, transactionItemsTable, transactionsTable } from '../db/schema';
import { type CreateTransactionItemInput, type TransactionItem } from '../schema';
import { eq } from 'drizzle-orm';

export async function addTransactionItem(input: CreateTransactionItemInput): Promise<TransactionItem> {
  try {
    // First verify the transaction exists
    const transaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, input.transaction_id))
      .execute();

    if (transaction.length === 0) {
      throw new Error(`Transaction with id ${input.transaction_id} not found`);
    }

    // Fetch catalog item details
    const catalogItems = await db.select()
      .from(catalogItemsTable)
      .where(eq(catalogItemsTable.id, input.catalog_item_id))
      .execute();

    if (catalogItems.length === 0) {
      throw new Error(`Catalog item with id ${input.catalog_item_id} not found`);
    }

    const catalogItem = catalogItems[0];

    // Calculate line total with discount
    const lineTotal = parseFloat(input.quantity.toString()) * input.unit_price * (1 - input.discount / 100);

    // Insert transaction item
    const result = await db.insert(transactionItemsTable)
      .values({
        transaction_id: input.transaction_id,
        catalog_item_id: input.catalog_item_id,
        item_code: catalogItem.item_code,
        item_name: catalogItem.item_name,
        quantity: input.quantity.toString(),
        unit_price: input.unit_price.toString(),
        discount: input.discount.toString(),
        line_total: lineTotal.toString()
      })
      .returning()
      .execute();

    const transactionItem = result[0];

    // Recalculate transaction totals
    await recalculateTransactionTotals(input.transaction_id);

    // Convert numeric fields back to numbers
    return {
      ...transactionItem,
      quantity: parseFloat(transactionItem.quantity),
      unit_price: parseFloat(transactionItem.unit_price),
      discount: parseFloat(transactionItem.discount),
      line_total: parseFloat(transactionItem.line_total)
    };
  } catch (error) {
    console.error('Add transaction item failed:', error);
    throw error;
  }
}

async function recalculateTransactionTotals(transactionId: number): Promise<void> {
  // Get transaction settings
  const transactions = await db.select()
    .from(transactionsTable)
    .where(eq(transactionsTable.id, transactionId))
    .execute();

  const transaction = transactions[0];

  // Get all transaction items
  const items = await db.select()
    .from(transactionItemsTable)
    .where(eq(transactionItemsTable.transaction_id, transactionId))
    .execute();

  // Calculate subtotal
  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.line_total), 0);

  // Calculate taxes based on transaction settings
  let vatAmount = 0;
  let localTaxAmount = 0;
  let pph22Amount = 0;
  let pph23Amount = 0;

  if (transaction.vat_enabled) {
    vatAmount = subtotal * 0.11; // 11% VAT
  }

  if (transaction.local_tax_enabled) {
    localTaxAmount = subtotal * 0.01; // 1% local tax
  }

  if (transaction.pph22_enabled) {
    pph22Amount = subtotal * 0.015; // 1.5% PPh22
  }

  if (transaction.pph23_enabled) {
    pph23Amount = subtotal * 0.02; // 2% PPh23
  }

  // Add service value if exists
  const serviceValue = transaction.service_value ? parseFloat(transaction.service_value) : 0;

  // Calculate stamp duty
  const totalBeforeStampDuty = subtotal + vatAmount + localTaxAmount + pph22Amount + pph23Amount + serviceValue;
  const stampDutyRequired = totalBeforeStampDuty >= 5000000; // 5 million IDR threshold
  const stampDutyAmount = stampDutyRequired ? 10000 : 0; // 10,000 IDR stamp duty

  // Calculate final total
  const totalAmount = totalBeforeStampDuty + stampDutyAmount;

  // Update transaction totals
  await db.update(transactionsTable)
    .set({
      subtotal: subtotal.toString(),
      vat_amount: vatAmount.toString(),
      local_tax_amount: localTaxAmount.toString(),
      pph22_amount: pph22Amount.toString(),
      pph23_amount: pph23Amount.toString(),
      stamp_duty_required: stampDutyRequired,
      stamp_duty_amount: stampDutyAmount.toString(),
      total_amount: totalAmount.toString(),
      updated_at: new Date()
    })
    .where(eq(transactionsTable.id, transactionId))
    .execute();
}
