
import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type Transaction, type TransactionFilter } from '../schema';
import { eq, gte, lte, ilike, and, desc, type SQL } from 'drizzle-orm';

export async function getTransactions(filter?: TransactionFilter): Promise<Transaction[]> {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (filter?.start_date) {
      conditions.push(gte(transactionsTable.transaction_date, filter.start_date));
    }

    if (filter?.end_date) {
      conditions.push(lte(transactionsTable.transaction_date, filter.end_date));
    }

    if (filter?.customer_name) {
      conditions.push(ilike(transactionsTable.customer_name, `%${filter.customer_name}%`));
    }

    // Build final query
    const results = conditions.length > 0
      ? await db.select()
          .from(transactionsTable)
          .where(and(...conditions))
          .orderBy(desc(transactionsTable.created_at))
          .execute()
      : await db.select()
          .from(transactionsTable)
          .orderBy(desc(transactionsTable.created_at))
          .execute();

    // Convert numeric fields back to numbers
    return results.map(transaction => ({
      ...transaction,
      subtotal: parseFloat(transaction.subtotal),
      vat_amount: parseFloat(transaction.vat_amount),
      local_tax_amount: parseFloat(transaction.local_tax_amount),
      pph22_amount: parseFloat(transaction.pph22_amount),
      pph23_amount: parseFloat(transaction.pph23_amount),
      service_value: transaction.service_value ? parseFloat(transaction.service_value) : null,
      stamp_duty_amount: parseFloat(transaction.stamp_duty_amount),
      total_amount: parseFloat(transaction.total_amount)
    }));
  } catch (error) {
    console.error('Failed to get transactions:', error);
    throw error;
  }
}
