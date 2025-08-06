
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Search, Package2 } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { CatalogItem, CreateCatalogItemInput, UpdateCatalogItemInput } from '../../../server/src/schema';

interface CatalogManagerProps {
  catalogItems: CatalogItem[];
  onUpdate: () => void;
}

export function CatalogManager({ catalogItems, onUpdate }: CatalogManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'goods' | 'service'>('all');

  const [formData, setFormData] = useState<CreateCatalogItemInput>({
    item_code: '',
    item_name: '',
    type: 'goods',
    unit_price: 0,
    description: null
  });

  // Filter items based on search and type
  const filteredItems = catalogItems.filter((item: CatalogItem) => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.item_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const resetForm = () => {
    setFormData({
      item_code: '',
      item_name: '',
      type: 'goods',
      unit_price: 0,
      description: null
    });
    setEditingItem(null);
    setError(null);
  };

  const handleCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (item: CatalogItem) => {
    setEditingItem(item);
    setFormData({
      item_code: item.item_code,
      item_name: item.item_name,
      type: item.type,
      unit_price: item.unit_price,
      description: item.description
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (editingItem) {
        const updateData: UpdateCatalogItemInput = {
          id: editingItem.id,
          ...formData
        };
        await trpc.updateCatalogItem.mutate(updateData);
      } else {
        await trpc.createCatalogItem.mutate(formData);
      }

      setIsDialogOpen(false);
      resetForm();
      onUpdate();
    } catch (err) {
      console.error('Failed to save catalog item:', err);
      setError(`Failed to ${editingItem ? 'update' : 'create'} catalog item. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this catalog item?')) return;

    setIsLoading(true);
    try {
      await trpc.deleteCatalogItem.mutate(id);
      onUpdate();
    } catch (err) {
      console.error('Failed to delete catalog item:', err);
      setError('Failed to delete catalog item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateCatalogItemInput, value: string | number | null) => {
    setFormData((prev: CreateCatalogItemInput) => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or code..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={(value: 'all' | 'goods' | 'service') => setTypeFilter(value)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="goods">Goods</SelectItem>
              <SelectItem value="service">Service</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package2 className="h-5 w-5" />
                {editingItem ? 'Edit Catalog Item' : 'Add New Catalog Item'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item_code">Item Code *</Label>
                  <Input
                    id="item_code"
                    value={formData.item_code}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleInputChange('item_code', e.target.value)
                    }
                    placeholder="ITM001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select value={formData.type} onValueChange={(value: 'goods' | 'service') => handleInputChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="goods">Goods</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="item_name">Item/Service Name *</Label>
                <Input
                  id="item_name"
                  value={formData.item_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange('item_name', e.target.value)
                  }
                  placeholder="Item name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_price">Unit Price (Rp) *</Label>
                <Input
                  id="unit_price"
                  type="number"
                  value={formData.unit_price}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange('unit_price', parseFloat(e.target.value) || 0)
                  }
                  placeholder="50000"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    handleInputChange('description', e.target.value || null)
                  }
                  placeholder="Additional description..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : (editingItem ? 'Update' : 'Create')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Catalog table */}
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  {catalogItems.length === 0 ? (
                    <div className="space-y-2">
                      <Package2 className="h-8 w-8 mx-auto text-gray-400" />
                      <p>No catalog items yet. Add your first item! 📦</p>
                    </div>
                  ) : (
                    'No items match your search criteria'
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item: CatalogItem) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">{item.item_code}</TableCell>
                  <TableCell className="font-medium">{item.item_name}</TableCell>
                  <TableCell>
                    <Badge variant={item.type === 'goods' ? 'default' : 'secondary'}>
                      {item.type === 'goods' ? '📦 Goods' : '🔧 Service'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    Rp {item.unit_price.toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-gray-600">
                    {item.description || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(item)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {catalogItems.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          Showing {filteredItems.length} of {catalogItems.length} items
        </div>
      )}
    </div>
  );
}
