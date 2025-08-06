
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Schema imports
import { 
  storeProfileInputSchema,
  createCatalogItemInputSchema,
  updateCatalogItemInputSchema,
  catalogFilterSchema,
  createTransactionInputSchema,
  transactionFilterSchema,
  createTransactionItemInputSchema,
  generateDocumentInputSchema
} from './schema';

// Handler imports
import { createStoreProfile } from './handlers/create_store_profile';
import { getStoreProfile } from './handlers/get_store_profile';
import { createCatalogItem } from './handlers/create_catalog_item';
import { getCatalogItems } from './handlers/get_catalog_items';
import { updateCatalogItem } from './handlers/update_catalog_item';
import { deleteCatalogItem } from './handlers/delete_catalog_item';
import { createTransaction } from './handlers/create_transaction';
import { getTransactions } from './handlers/get_transactions';
import { getTransactionById } from './handlers/get_transaction_by_id';
import { addTransactionItem } from './handlers/add_transaction_item';
import { removeTransactionItem } from './handlers/remove_transaction_item';
import { generateDocument } from './handlers/generate_document';
import { z } from 'zod';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Store Profile routes
  createStoreProfile: publicProcedure
    .input(storeProfileInputSchema)
    .mutation(({ input }) => createStoreProfile(input)),
  
  getStoreProfile: publicProcedure
    .query(() => getStoreProfile()),

  // Catalog Item routes
  createCatalogItem: publicProcedure
    .input(createCatalogItemInputSchema)
    .mutation(({ input }) => createCatalogItem(input)),
  
  getCatalogItems: publicProcedure
    .input(catalogFilterSchema.optional())
    .query(({ input }) => getCatalogItems(input)),
  
  updateCatalogItem: publicProcedure
    .input(updateCatalogItemInputSchema)
    .mutation(({ input }) => updateCatalogItem(input)),
  
  deleteCatalogItem: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteCatalogItem(input)),

  // Transaction routes
  createTransaction: publicProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input }) => createTransaction(input)),
  
  getTransactions: publicProcedure
    .input(transactionFilterSchema.optional())
    .query(({ input }) => getTransactions(input)),
  
  getTransactionById: publicProcedure
    .input(z.number())
    .query(({ input }) => getTransactionById(input)),

  // Transaction Item routes
  addTransactionItem: publicProcedure
    .input(createTransactionItemInputSchema)
    .mutation(({ input }) => addTransactionItem(input)),
  
  removeTransactionItem: publicProcedure
    .input(z.number())
    .mutation(({ input }) => removeTransactionItem(input)),

  // Document Generation routes
  generateDocument: publicProcedure
    .input(generateDocumentInputSchema)
    .mutation(({ input }) => generateDocument(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
