
import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type CreateTransactionInput, type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export const createTransaction = async (input: CreateTransactionInput): Promise<Transaction> => {
  try {
    // Check if transaction_id already exists to ensure uniqueness
    const existingTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.transaction_id, input.transaction_id))
      .execute();

    if (existingTransaction.length > 0) {
      throw new Error(`Transaction with ID ${input.transaction_id} already exists`);
    }

    // Insert transaction record with initial values (taxes will be calculated when items are added)
    const result = await db.insert(transactionsTable)
      .values({
        transaction_id: input.transaction_id,
        transaction_date: input.transaction_date,
        customer_name: input.customer_name,
        customer_address: input.customer_address,
        treasurer_principal_name: input.treasurer_principal_name,
        courier: input.courier,
        additional_notes: input.additional_notes,
        buyer_npwp: input.buyer_npwp,
        // Initial financial values - will be updated when items are added
        subtotal: '0',
        vat_amount: '0',
        local_tax_amount: '0',
        pph22_amount: '0',
        pph23_amount: '0',
        service_value: input.service_value ? input.service_value.toString() : null,
        service_type: input.service_type,
        stamp_duty_required: false,
        stamp_duty_amount: '0',
        total_amount: '0',
        // Tax enablement flags
        vat_enabled: input.vat_enabled,
        local_tax_enabled: input.local_tax_enabled,
        pph22_enabled: input.pph22_enabled,
        pph23_enabled: input.pph23_enabled
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const transaction = result[0];
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
    console.error('Transaction creation failed:', error);
    throw error;
  }
};
