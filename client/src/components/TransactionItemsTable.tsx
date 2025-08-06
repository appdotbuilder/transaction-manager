
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import type { CatalogItem } from '../../../server/src/schema';

interface TransactionItemData {
  catalog_item_id: number;
  item_code: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  line_total: number;
}

interface TransactionItemsTableProps {
  catalogItems: CatalogItem[];
  transactionItems: TransactionItemData[];
  onAddItem: (catalogItem: CatalogItem, quantity: number, discount: number) => void;
  onRemoveItem: (index: number) => void;
  onUpdateItem: (index: number, updates: Partial<TransactionItemData>) => void;
}

export function TransactionItemsTable({
  catalogItems,
  transactionItems,
  onAddItem,
  onRemoveItem,
  onUpdateItem
}: TransactionItemsTableProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCatalogItemId, setSelectedCatalogItemId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [discount, setDiscount] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter catalog items based on search
  const filteredCatalogItems = catalogItems.filter((item: CatalogItem) =>
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.item_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCatalogItem = catalogItems.find((item: CatalogItem) => item.id === selectedCatalogItemId);

  const handleAddItem = () => {
    if (!selectedCatalogItem) return;

    onAddItem(selectedCatalogItem, quantity, discount);
    
    // Reset form
    setSelectedCatalogItemId(null);
    setQuantity(1);
    setDiscount(0);
    setSearchTerm('');
    setIsDialogOpen(false);
  };

  const calculateLineTotal = (unitPrice: number, qty: number, disc: number) => {
    return (unitPrice * qty) * (1 - disc / 100);
  };

  return (
    <div className="space-y-4">
      {/* Add Item Button */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Transaction Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Search and select catalog item */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Item</label>
              <Input
                placeholder="Search by name or code..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Item *</label>
              <Select 
                value={selectedCatalogItemId?.toString() || 'none'} 
                onValueChange={(value: string) => {
                  if (value === 'none') {
                    setSelectedCatalogItemId(null);
                  } else {
                    setSelectedCatalogItemId(parseInt(value));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an item..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredCatalogItems.length === 0 ? (
                    <SelectItem value="none" disabled>No items found</SelectItem>
                  ) : (
                    <>
                      <SelectItem value="none">Choose an item...</SelectItem>
                      {filteredCatalogItems.map((item: CatalogItem) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          <div className="flex items-center justify-between w-full">
                            <span>[{item.item_code}] {item.item_name}</span>
                            <Badge variant={item.type === 'goods' ? 'default' : 'secondary'} className="ml-2">
                              {item.type}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedCatalogItem && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm"><span className="font-medium">Price:</span> Rp {selectedCatalogItem.unit_price.toLocaleString('id-ID')}</p>
                {selectedCatalogItem.description && (
                  <p className="text-sm text-gray-600 mt-1">{selectedCatalogItem.description}</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity *</label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(parseInt(e.target.value) || 1)}
                  min="1"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Discount (%)</label>
                <Input
                  type="number"
                  value={discount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDiscount(parseFloat(e.target.value) || 0)}
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
            </div>

            {selectedCatalogItem && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900">
                  Line Total: Rp {calculateLineTotal(selectedCatalogItem.unit_price, quantity, discount).toLocaleString('id-ID')}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddItem} disabled={!selectedCatalogItem}>
                Add Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Items Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead className="text-center">Qty</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-center">Disc %</TableHead>
              <TableHead className="text-right">Line Total</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactionItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No items added yet. Click "Add Item" to start building your transaction. 📦
                </TableCell>
              </TableRow>
            ) : (
              transactionItems.map((item: TransactionItemData, index: number) => (
                <TableRow key={`${item.catalog_item_id}-${index}`}>
                  <TableCell className="font-mono text-sm">{item.item_code}</TableCell>
                  <TableCell className="font-medium">{item.item_name}</TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        onUpdateItem(index, { quantity: parseInt(e.target.value) || 1 })
                      }
                      className="w-20 text-center"
                      min="1"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      value={item.unit_price}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        onUpdateItem(index, { unit_price: parseFloat(e.target.value) || 0 })
                      }
                      className="w-32 text-right font-mono"
                      min="0"
                      step="0.01"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      value={item.discount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        onUpdateItem(index, { discount: parseFloat(e.target.value) || 0 })
                      }
                      className="w-20 text-center"
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    Rp {item.line_total.toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveItem(index)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {transactionItems.length > 0 && (
        <div className="flex justify-end">
          <div className="text-sm text-gray-600">
            Total items: {transactionItems.length} | 
            Subtotal: <span className="font-mono font-medium">
              Rp {transactionItems.reduce((sum: number, item: TransactionItemData) => sum + item.line_total, 0).toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
