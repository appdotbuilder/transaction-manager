
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, RefreshCw, Eye, FileText } from 'lucide-react';
import type { Transaction, TransactionFilter } from '../../../server/src/schema';

interface TransactionHistoryProps {
  transactions: Transaction[];
  onRefresh: () => void;
}

export function TransactionHistory({ transactions, onRefresh }: TransactionHistoryProps) {
  const [filters, setFilters] = useState<TransactionFilter>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filter transactions locally
  const filteredTransactions = transactions.filter((transaction: Transaction) => {
    const matchesSearch = !searchTerm || 
      transaction.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.transaction_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStartDate = !filters.start_date || 
      new Date(transaction.transaction_date) >= filters.start_date;
    
    const matchesEndDate = !filters.end_date ||
      new Date(transaction.transaction_date) <= filters.end_date;

    return matchesSearch && matchesStartDate && matchesEndDate;
  });

  const handleRefresh = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UX
    onRefresh();
    setIsLoading(false);
  };

  const handleViewTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
  };

  const formatCurrency = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by customer name or transaction ID..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={filters.start_date?.toISOString().split('T')[0] || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const date = e.target.value ? new Date(e.target.value) : undefined;
                  setFilters((prev: TransactionFilter) => ({ ...prev, start_date: date }));
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={filters.end_date?.toISOString().split('T')[0] || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const date = e.target.value ? new Date(e.target.value) : undefined;
                  setFilters((prev: TransactionFilter) => ({ ...prev, end_date: date }));
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Table */}
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead>Tax Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  {transactions.length === 0 ? (
                    <div className="space-y-2">
                      <FileText className="h-8 w-8 mx-auto text-gray-400" />
                      <p>No transactions yet. Create your first transaction! 💼</p>
                    </div>
                  ) : (
                    'No transactions match your search criteria'
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((transaction: Transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-mono text-sm">{transaction.transaction_id}</TableCell>
                  <TableCell>{transaction.transaction_date.toLocaleDateString('id-ID')}</TableCell>
                  <TableCell className="font-medium">{transaction.customer_name}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(transaction.total_amount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {transaction.vat_enabled && (
                        <Badge variant="secondary" className="text-xs">VAT</Badge>
                      )}
                      {transaction.local_tax_enabled && (
                        <Badge variant="secondary" className="text-xs">Local Tax</Badge>
                      )}
                      {transaction.pph22_enabled && (
                        <Badge variant="outline" className="text-xs">PPh22</Badge>
                      )}
                      {transaction.pph23_enabled && (
                        <Badge variant="outline" className="text-xs">PPh23</Badge>
                      )}
                      {transaction.stamp_duty_required && (
                        <Badge variant="default" className="text-xs">Stamp</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewTransaction(transaction)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Transaction Details - {transaction.transaction_id}
                          </DialogTitle>
                        </DialogHeader>
                        {selectedTransaction && (
                          <div className="space-y-4 max-h-96 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-600">Date:</span>
                                <p>{selectedTransaction.transaction_date.toLocaleDateString('id-ID')}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Customer:</span>
                                <p>{selectedTransaction.customer_name}</p>
                              </div>
                              <div className="md:col-span-2">
                                <span className="font-medium text-gray-600">Address:</span>
                                <p>{selectedTransaction.customer_address}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Treasurer/Principal:</span>
                                <p>{selectedTransaction.treasurer_principal_name}</p>
                              </div>
                              {selectedTransaction.courier && (
                                <div>
                                  <span className="font-medium text-gray-600">Courier:</span>
                                  <p>{selectedTransaction.courier}</p>
                                </div>
                              )}
                              {selectedTransaction.buyer_npwp && (
                                <div className="md:col-span-2">
                                  <span className="font-medium text-gray-600">Buyer NPWP:</span>
                                  <p className="font-mono">{selectedTransaction.buyer_npwp}</p>
                                </div>
                              )}
                            </div>

                            <div className="border-t pt-4">
                              <h4 className="font-medium mb-2">Transaction Summary</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span>Subtotal:</span>
                                  <span className="font-mono">{formatCurrency(selectedTransaction.subtotal)}</span>
                                </div>
                                {selectedTransaction.vat_enabled && selectedTransaction.vat_amount > 0 && (
                                  <div className="flex justify-between text-green-700">
                                    <span>VAT (11%):</span>
                                    <span className="font-mono">+ {formatCurrency(selectedTransaction.vat_amount)}</span>
                                  </div>
                                )}
                                {selectedTransaction.local_tax_enabled && selectedTransaction.local_tax_amount > 0 && (
                                  <div className="flex justify-between text-green-700">
                                    <span>Local Tax (10%):</span>
                                    <span className="font-mono">+ {formatCurrency(selectedTransaction.local_tax_amount)}</span>
                                  </div>
                                )}
                                {selectedTransaction.stamp_duty_required && (
                                  <div className="flex justify-between text-blue-700">
                                    <span>Stamp Duty:</span>
                                    <span className="font-mono">+ {formatCurrency(selectedTransaction.stamp_duty_amount)}</span>
                                  </div>
                                )}
                                {selectedTransaction.pph22_enabled && selectedTransaction.pph22_amount > 0 && (
                                  <div className="flex justify-between text-red-700">
                                    <span>PPh Article 22 (1.5%):</span>
                                    <span className="font-mono">- {formatCurrency(selectedTransaction.pph22_amount)}</span>
                                  </div>
                                )}
                                {selectedTransaction.pph23_enabled && selectedTransaction.pph23_amount > 0 && (
                                  <div className="flex justify-between text-red-700">
                                    <span>PPh Article 23 (2%):</span>
                                    <span className="font-mono">- {formatCurrency(selectedTransaction.pph23_amount)}</span>
                                  </div>
                                )}
                                <div className="border-t pt-2 flex justify-between font-bold">
                                  <span>Total Amount:</span>
                                  <span className="font-mono">{formatCurrency(selectedTransaction.total_amount)}</span>
                                </div>
                              </div>
                            </div>

                            {selectedTransaction.additional_notes && (
                              <div className="border-t pt-4">
                                <span className="font-medium text-gray-600">Additional Notes:</span>
                                <p className="text-sm mt-1">{selectedTransaction.additional_notes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {transactions.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </span>
          <span>
            Total Value: <span className="font-mono font-medium">
              {formatCurrency(filteredTransactions.reduce((sum: number, t: Transaction) => sum + t.total_amount, 0))}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
