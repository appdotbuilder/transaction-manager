
import { db } from '../db';
import { transactionItemsTable, transactionsTable } from '../db/schema';
import { eq, sum } from 'drizzle-orm';

export async function removeTransactionItem(id: number): Promise<void> {
  try {
    // First, get the transaction item to find the transaction_id
    const transactionItems = await db.select()
      .from(transactionItemsTable)
      .where(eq(transactionItemsTable.id, id))
      .execute();

    if (transactionItems.length === 0) {
      throw new Error('Transaction item not found');
    }

    const transactionItem = transactionItems[0];
    const transactionId = transactionItem.transaction_id;

    // Remove the transaction item
    await db.delete(transactionItemsTable)
      .where(eq(transactionItemsTable.id, id))
      .execute();

    // Get the transaction to check tax settings
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    if (transactions.length === 0) {
      throw new Error('Transaction not found');
    }

    const transaction = transactions[0];

    // Recalculate totals from remaining items
    const remainingItems = await db.select()
      .from(transactionItemsTable)
      .where(eq(transactionItemsTable.transaction_id, transactionId))
      .execute();

    // Calculate subtotal from remaining items
    const subtotal = remainingItems.reduce((total, item) => {
      return total + parseFloat(item.line_total);
    }, 0);

    // Calculate service value if applicable
    let serviceValue = null;
    if (transaction.service_value !== null) {
      serviceValue = parseFloat(transaction.service_value);
    }

    // Calculate tax amounts based on enabled flags
    const vatAmount = transaction.vat_enabled ? subtotal * 0.11 : 0;
    const localTaxAmount = transaction.local_tax_enabled ? subtotal * 0.01 : 0;
    const pph22Amount = transaction.pph22_enabled ? subtotal * 0.015 : 0;
    const pph23Amount = transaction.pph23_enabled && serviceValue !== null ? serviceValue * 0.02 : 0;

    // Calculate stamp duty requirement and amount
    const totalBeforeStampDuty = subtotal + vatAmount + localTaxAmount + pph22Amount + pph23Amount;
    const stampDutyRequired = totalBeforeStampDuty >= 5000000;
    const stampDutyAmount = stampDutyRequired ? 10000 : 0;

    // Calculate final total
    const totalAmount = totalBeforeStampDuty + stampDutyAmount;

    // Update transaction with recalculated values
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

  } catch (error) {
    console.error('Remove transaction item failed:', error);
    throw error;
  }
}
