
import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Store, ShoppingCart, Package, FileText, History } from 'lucide-react';
import { trpc } from '@/utils/trpc';

// Import feature components
import { StoreProfileManager } from '@/components/StoreProfileManager';
import { CatalogManager } from '@/components/CatalogManager';
import { TransactionManager } from '@/components/TransactionManager';
import { TransactionHistory } from '@/components/TransactionHistory';
import { DocumentGenerator } from '@/components/DocumentGenerator';

// Import types
import type { StoreProfile, CatalogItem, Transaction } from '../../server/src/schema';

function App() {
  const [activeTab, setActiveTab] = useState('store');
  const [storeProfile, setStoreProfile] = useState<StoreProfile | null>(null);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load store profile, catalog, and transactions in parallel
      const [profileResult, catalogResult, transactionsResult] = await Promise.all([
        trpc.getStoreProfile.query().catch(() => null),
        trpc.getCatalogItems.query().catch(() => []),
        trpc.getTransactions.query().catch(() => [])
      ]);

      setStoreProfile(profileResult);
      setCatalogItems(catalogResult);
      setTransactions(transactionsResult);
    } catch (err) {
      console.error('Failed to load initial data:', err);
      setError('Failed to load application data. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleStoreProfileUpdate = useCallback((profile: StoreProfile) => {
    setStoreProfile(profile);
  }, []);

  const handleCatalogUpdate = useCallback(() => {
    // Reload catalog items
    trpc.getCatalogItems.query()
      .then(setCatalogItems)
      .catch(console.error);
  }, []);

  const handleTransactionUpdate = useCallback(() => {
    // Reload transactions
    trpc.getTransactions.query()
      .then(setTransactions)
      .catch(console.error);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading Transaction Manager...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">📄 Transaction Document Manager</h1>
                <p className="text-sm text-gray-500">Complete transaction and document management</p>
              </div>
            </div>
            {storeProfile && (
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{storeProfile.store_name}</p>
                <p className="text-xs text-gray-500">{storeProfile.email}</p>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:grid-cols-5 bg-white shadow-sm">
            <TabsTrigger value="store" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Store Profile</span>
            </TabsTrigger>
            <TabsTrigger value="catalog" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Catalog</span>
            </TabsTrigger>
            <TabsTrigger value="transaction" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">New Transaction</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="store" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-indigo-600" />
                  Store Profile Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StoreProfileManager
                  storeProfile={storeProfile}
                  onUpdate={handleStoreProfileUpdate}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="catalog" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-indigo-600" />
                  Item & Service Catalog
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CatalogManager
                  catalogItems={catalogItems}
                  onUpdate={handleCatalogUpdate}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transaction" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-indigo-600" />
                  New Transaction
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!storeProfile ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please set up your store profile first before creating transactions.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <TransactionManager
                    catalogItems={catalogItems}
                    storeProfile={storeProfile}
                    onTransactionCreated={handleTransactionUpdate}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-indigo-600" />
                  Transaction History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TransactionHistory
                  transactions={transactions}
                  onRefresh={handleTransactionUpdate}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  Document Generator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DocumentGenerator
                  transactions={transactions}
                  storeProfile={storeProfile}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;
