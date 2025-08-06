
import { db } from '../db';
import { transactionsTable, transactionItemsTable, catalogItemsTable } from '../db/schema';
import { type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export async function getTransactionById(id: number): Promise<Transaction | null> {
  try {
    // First get the transaction
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, id))
      .execute();

    if (transactions.length === 0) {
      return null;
    }

    const transaction = transactions[0];

    // Convert all numeric fields to numbers
    return {
      ...transaction,
      subtotal: parseFloat(transaction.subtotal),
      vat_amount: parseFloat(transaction.vat_amount),
      local_tax_amount: parseFloat(transaction.local_tax_amount),
      pph22_amount: parseFloat(transaction.pph22_amount),
      pph23_amount: parseFloat(transaction.pph23_amount),
      service_value: transaction.service_value ? parseFloat(transaction.service_value) : null,
      stamp_duty_amount: parseFloat(transaction.stamp_duty_amount),
      total_amount: parseFloat(transaction.total_amount)
    };
  } catch (error) {
    console.error('Failed to get transaction by ID:', error);
    throw error;
  }
}
