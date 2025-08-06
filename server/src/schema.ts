
import { z } from 'zod';

// Store profile schema
export const storeProfileSchema = z.object({
  id: z.number(),
  store_name: z.string(),
  full_address: z.string(),
  phone_number: z.string(),
  email: z.string().email(),
  npwp: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type StoreProfile = z.infer<typeof storeProfileSchema>;

// Input schema for creating/updating store profile
export const storeProfileInputSchema = z.object({
  store_name: z.string().min(1),
  full_address: z.string().min(1),
  phone_number: z.string().min(1),
  email: z.string().email(),
  npwp: z.string().min(1)
});

export type StoreProfileInput = z.infer<typeof storeProfileInputSchema>;

// Item/Service catalog schema
export const itemTypeEnum = z.enum(['goods', 'service']);

export const catalogItemSchema = z.object({
  id: z.number(),
  item_code: z.string(),
  item_name: z.string(),
  type: itemTypeEnum,
  unit_price: z.number().positive(),
  description: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type CatalogItem = z.infer<typeof catalogItemSchema>;

// Input schema for creating catalog items
export const createCatalogItemInputSchema = z.object({
  item_code: z.string().min(1),
  item_name: z.string().min(1),
  type: itemTypeEnum,
  unit_price: z.number().positive(),
  description: z.string().nullable()
});

export type CreateCatalogItemInput = z.infer<typeof createCatalogItemInputSchema>;

// Input schema for updating catalog items
export const updateCatalogItemInputSchema = z.object({
  id: z.number(),
  item_code: z.string().min(1).optional(),
  item_name: z.string().min(1).optional(),
  type: itemTypeEnum.optional(),
  unit_price: z.number().positive().optional(),
  description: z.string().nullable().optional()
});

export type UpdateCatalogItemInput = z.infer<typeof updateCatalogItemInputSchema>;

// Transaction schema
export const transactionSchema = z.object({
  id: z.number(),
  transaction_id: z.string(),
  transaction_date: z.coerce.date(),
  customer_name: z.string(),
  customer_address: z.string(),
  treasurer_principal_name: z.string(),
  courier: z.string().nullable(),
  additional_notes: z.string().nullable(),
  buyer_npwp: z.string().nullable(),
  subtotal: z.number(),
  vat_amount: z.number(),
  local_tax_amount: z.number(),
  pph22_amount: z.number(),
  pph23_amount: z.number(),
  service_value: z.number().nullable(),
  service_type: z.string().nullable(),
  stamp_duty_required: z.boolean(),
  stamp_duty_amount: z.number(),
  total_amount: z.number(),
  vat_enabled: z.boolean(),
  local_tax_enabled: z.boolean(),
  pph22_enabled: z.boolean(),
  pph23_enabled: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

// Input schema for creating transactions
export const createTransactionInputSchema = z.object({
  transaction_id: z.string().min(1),
  transaction_date: z.coerce.date(),
  customer_name: z.string().min(1),
  customer_address: z.string().min(1),
  treasurer_principal_name: z.string().min(1),
  courier: z.string().nullable(),
  additional_notes: z.string().nullable(),
  buyer_npwp: z.string().nullable(),
  service_value: z.number().nullable(),
  service_type: z.string().nullable(),
  vat_enabled: z.boolean().default(true),
  local_tax_enabled: z.boolean().default(true),
  pph22_enabled: z.boolean().default(true),
  pph23_enabled: z.boolean().default(false)
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

// Transaction item schema
export const transactionItemSchema = z.object({
  id: z.number(),
  transaction_id: z.number(),
  catalog_item_id: z.number(),
  item_code: z.string(),
  item_name: z.string(),
  quantity: z.number().positive(),
  unit_price: z.number().positive(),
  discount: z.number().min(0).max(100),
  line_total: z.number(),
  created_at: z.coerce.date()
});

export type TransactionItem = z.infer<typeof transactionItemSchema>;

// Input schema for creating transaction items
export const createTransactionItemInputSchema = z.object({
  transaction_id: z.number(),
  catalog_item_id: z.number(),
  quantity: z.number().positive(),
  unit_price: z.number().positive(),
  discount: z.number().min(0).max(100).default(0)
});

export type CreateTransactionItemInput = z.infer<typeof createTransactionItemInputSchema>;

// Document generation schema
export const documentTypeEnum = z.enum([
  'sales_note',
  'payment_receipt',
  'invoice',
  'bast',
  'purchase_order',
  'tax_invoice',
  'proforma_invoice'
]);

export const generateDocumentInputSchema = z.object({
  transaction_id: z.number(),
  document_type: documentTypeEnum,
  document_date: z.coerce.date().optional(),
  city_regency: z.string().optional(),
  courier_name: z.string().optional(),
  bast_recipient: z.string().optional()
});

export type GenerateDocumentInput = z.infer<typeof generateDocumentInputSchema>;

// Filter schemas
export const catalogFilterSchema = z.object({
  type: itemTypeEnum.optional(),
  search: z.string().optional()
});

export type CatalogFilter = z.infer<typeof catalogFilterSchema>;

export const transactionFilterSchema = z.object({
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  customer_name: z.string().optional()
});

export type TransactionFilter = z.infer<typeof transactionFilterSchema>;
