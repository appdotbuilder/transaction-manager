
import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const itemTypeEnum = pgEnum('item_type', ['goods', 'service']);

// Store profile table
export const storeProfilesTable = pgTable('store_profiles', {
  id: serial('id').primaryKey(),
  store_name: text('store_name').notNull(),
  full_address: text('full_address').notNull(),
  phone_number: text('phone_number').notNull(),
  email: text('email').notNull(),
  npwp: text('npwp').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Catalog items table
export const catalogItemsTable = pgTable('catalog_items', {
  id: serial('id').primaryKey(),
  item_code: text('item_code').notNull().unique(),
  item_name: text('item_name').notNull(),
  type: itemTypeEnum('type').notNull(),
  unit_price: numeric('unit_price', { precision: 15, scale: 2 }).notNull(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Transactions table
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  transaction_id: text('transaction_id').notNull().unique(),
  transaction_date: timestamp('transaction_date').notNull(),
  customer_name: text('customer_name').notNull(),
  customer_address: text('customer_address').notNull(),
  treasurer_principal_name: text('treasurer_principal_name').notNull(),
  courier: text('courier'),
  additional_notes: text('additional_notes'),
  buyer_npwp: text('buyer_npwp'),
  subtotal: numeric('subtotal', { precision: 15, scale: 2 }).notNull(),
  vat_amount: numeric('vat_amount', { precision: 15, scale: 2 }).notNull(),
  local_tax_amount: numeric('local_tax_amount', { precision: 15, scale: 2 }).notNull(),
  pph22_amount: numeric('pph22_amount', { precision: 15, scale: 2 }).notNull(),
  pph23_amount: numeric('pph23_amount', { precision: 15, scale: 2 }).notNull(),
  service_value: numeric('service_value', { precision: 15, scale: 2 }),
  service_type: text('service_type'),
  stamp_duty_required: boolean('stamp_duty_required').notNull(),
  stamp_duty_amount: numeric('stamp_duty_amount', { precision: 15, scale: 2 }).notNull(),
  total_amount: numeric('total_amount', { precision: 15, scale: 2 }).notNull(),
  vat_enabled: boolean('vat_enabled').notNull().default(true),
  local_tax_enabled: boolean('local_tax_enabled').notNull().default(true),
  pph22_enabled: boolean('pph22_enabled').notNull().default(true),
  pph23_enabled: boolean('pph23_enabled').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Transaction items table
export const transactionItemsTable = pgTable('transaction_items', {
  id: serial('id').primaryKey(),
  transaction_id: integer('transaction_id').notNull().references(() => transactionsTable.id, { onDelete: 'cascade' }),
  catalog_item_id: integer('catalog_item_id').notNull().references(() => catalogItemsTable.id),
  item_code: text('item_code').notNull(),
  item_name: text('item_name').notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(),
  unit_price: numeric('unit_price', { precision: 15, scale: 2 }).notNull(),
  discount: numeric('discount', { precision: 5, scale: 2 }).notNull().default('0'),
  line_total: numeric('line_total', { precision: 15, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const transactionsRelations = relations(transactionsTable, ({ many }) => ({
  items: many(transactionItemsTable),
}));

export const transactionItemsRelations = relations(transactionItemsTable, ({ one }) => ({
  transaction: one(transactionsTable, {
    fields: [transactionItemsTable.transaction_id],
    references: [transactionsTable.id],
  }),
  catalogItem: one(catalogItemsTable, {
    fields: [transactionItemsTable.catalog_item_id],
    references: [catalogItemsTable.id],
  }),
}));

export const catalogItemsRelations = relations(catalogItemsTable, ({ many }) => ({
  transactionItems: many(transactionItemsTable),
}));

// TypeScript types for the table schemas
export type StoreProfile = typeof storeProfilesTable.$inferSelect;
export type NewStoreProfile = typeof storeProfilesTable.$inferInsert;

export type CatalogItem = typeof catalogItemsTable.$inferSelect;
export type NewCatalogItem = typeof catalogItemsTable.$inferInsert;

export type Transaction = typeof transactionsTable.$inferSelect;
export type NewTransaction = typeof transactionsTable.$inferInsert;

export type TransactionItem = typeof transactionItemsTable.$inferSelect;
export type NewTransactionItem = typeof transactionItemsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  storeProfiles: storeProfilesTable,
  catalogItems: catalogItemsTable,
  transactions: transactionsTable,
  transactionItems: transactionItemsTable,
};
