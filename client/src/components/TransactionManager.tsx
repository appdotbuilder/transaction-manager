
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Calendar, Calculator, CheckCircle, Save, Plus } from 'lucide-react';
import { TransactionItemsTable } from '@/components/TransactionItemsTable';
import { trpc } from '@/utils/trpc';
import type { 
  CreateTransactionInput, 
  CatalogItem, 
  StoreProfile, 
  CreateTransactionItemInput 
} from '../../../server/src/schema';

interface TransactionManagerProps {
  catalogItems: CatalogItem[];
  storeProfile: StoreProfile;
  onTransactionCreated: () => void;
}

interface TransactionFormData extends Omit<CreateTransactionInput, 'transaction_date'> {
  transaction_date: string;
}

interface TransactionItemData {
  catalog_item_id: number;
  item_code: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  line_total: number;
}

export function TransactionManager({ 
  catalogItems, 
  onTransactionCreated 
}: TransactionManagerProps) {
  const [formData, setFormData] = useState<TransactionFormData>({
    transaction_id: `TXN-${Date.now()}`,
    transaction_date: new Date().toISOString().split('T')[0],
    customer_name: '',
    customer_address: '',
    treasurer_principal_name: '',
    courier: null,
    additional_notes: null,
    buyer_npwp: null,
    service_value: null,
    service_type: null,
    vat_enabled: true,
    local_tax_enabled: true,
    pph22_enabled: true,
    pph23_enabled: false
  });

  const [transactionItems, setTransactionItems] = useState<TransactionItemData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate totals
  const calculations = useCallback(() => {
    const subtotal = transactionItems.reduce((sum: number, item: TransactionItemData) => sum + item.line_total, 0);
    
    const vatAmount = formData.vat_enabled ? subtotal * 0.11 : 0;
    const localTaxAmount = formData.local_tax_enabled ? subtotal * 0.10 : 0;
    const pph22Amount = formData.pph22_enabled ? subtotal * 0.015 : 0;
    const pph23Amount = formData.pph23_enabled && formData.service_value ? formData.service_value * 0.02 : 0;
    
    const stampDutyRequired = subtotal >= 5000000;
    const stampDutyAmount = stampDutyRequired ? 10000 : 0;
    
    const totalAmount = subtotal + vatAmount + localTaxAmount + stampDutyAmount - pph22Amount - pph23Amount;

    return {
      subtotal,
      vatAmount,
      localTaxAmount,
      pph22Amount,
      pph23Amount,
      stampDutyRequired,
      stampDutyAmount,
      totalAmount
    };
  }, [transactionItems, formData.vat_enabled, formData.local_tax_enabled, formData.pph22_enabled, formData.pph23_enabled, formData.service_value]);

  const totals = calculations();

  const handleInputChange = (field: keyof TransactionFormData, value: string | number | boolean | null) => {
    setFormData((prev: TransactionFormData) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddItem = (catalogItem: CatalogItem, quantity: number, discount: number) => {
    const lineTotal = (catalogItem.unit_price * quantity) * (1 - discount / 100);
    
    const newItem: TransactionItemData = {
      catalog_item_id: catalogItem.id,
      item_code: catalogItem.item_code,
      item_name: catalogItem.item_name,
      quantity,
      unit_price: catalogItem.unit_price,
      discount,
      line_total: lineTotal
    };

    setTransactionItems((prev: TransactionItemData[]) => [...prev, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    setTransactionItems((prev: TransactionItemData[]) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, updates: Partial<TransactionItemData>) => {
    setTransactionItems((prev: TransactionItemData[]) => prev.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, ...updates };
        updatedItem.line_total = (updatedItem.unit_price * updatedItem.quantity) * (1 - updatedItem.discount / 100);
        return updatedItem;
      }
      return item;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (transactionItems.length === 0) {
      setError('Please add at least one item to the transaction.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Create transaction
      const transactionInput: CreateTransactionInput = {
        ...formData,
        transaction_date: new Date(formData.transaction_date)
      };

      const transaction = await trpc.createTransaction.mutate(transactionInput);

      // Add transaction items
      for (const item of transactionItems) {
        const itemInput: CreateTransactionItemInput = {
          transaction_id: transaction.id,
          catalog_item_id: item.catalog_item_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount
        };
        await trpc.addTransactionItem.mutate(itemInput);
      }

      // Reset form
      setFormData({
        transaction_id: `TXN-${Date.now()}`,
        transaction_date: new Date().toISOString().split('T')[0],
        customer_name: '',
        customer_address: '',
        treasurer_principal_name: '',
        courier: null,
        additional_notes: null,
        buyer_npwp: null,
        service_value: null,
        service_type: null,
        vat_enabled: true,
        local_tax_enabled: true,
        pph22_enabled: true,
        pph23_enabled: false
      });
      setTransactionItems([]);
      setSuccess(true);
      onTransactionCreated();
      
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error('Failed to create transaction:', err);
      setError('Failed to create transaction. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Transaction created successfully! 🎉 You can now generate documents for this transaction.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Transaction Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Transaction Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transaction_id">Transaction ID *</Label>
                <Input
                  id="transaction_id"
                  value={formData.transaction_id}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange('transaction_id', e.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transaction_date">Transaction Date *</Label>
                <Input
                  id="transaction_date"
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange('transaction_date', e.target.value)
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer_name">Customer Name (School/Institution) *</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange('customer_name', e.target.value)
                  }
                  placeholder="School/Institution name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="treasurer_principal_name">Treasurer/Principal Name *</Label>
                <Input
                  id="treasurer_principal_name"
                  value={formData.treasurer_principal_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange('treasurer_principal_name', e.target.value)
                  }
                  placeholder="Name of treasurer or principal"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_address">Customer Address *</Label>
              <Input
                id="customer_address"
                value={formData.customer_address}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('customer_address', e.target.value)
                }
                placeholder="Complete customer address"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="courier">Courier (Optional)</Label>
                <Input
                  id="courier"
                  value={formData.courier || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange('courier', e.target.value || null)
                  }
                  placeholder="Courier name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="additional_notes">Additional Notes (Optional)</Label>
                <Input
                  id="additional_notes"
                  value={formData.additional_notes || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange('additional_notes', e.target.value || null)
                  }
                  placeholder="Any additional notes"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Transaction Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionItemsTable
              catalogItems={catalogItems}
              transactionItems={transactionItems}
              onAddItem={handleAddItem}
              onRemoveItem={handleRemoveItem}
              onUpdateItem={handleUpdateItem}
            />
          </CardContent>
        </Card>

        {/* Tax Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Tax Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="vat_enabled">VAT (11%)</Label>
                  <Switch
                    id="vat_enabled"
                    checked={formData.vat_enabled}
                    onCheckedChange={(checked: boolean) => handleInputChange('vat_enabled', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="local_tax_enabled">Local Tax (10%)</Label>
                  <Switch
                    id="local_tax_enabled"
                    checked={formData.local_tax_enabled}
                    onCheckedChange={(checked: boolean) => handleInputChange('local_tax_enabled', checked)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pph22_enabled">PPh Article 22 (1.5%)</Label>
                  <Switch
                    id="pph22_enabled"
                    checked={formData.pph22_enabled}
                    onCheckedChange={(checked: boolean) => handleInputChange('pph22_enabled', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="pph23_enabled">PPh Article 23 (2%)</Label>
                  <Switch
                    id="pph23_enabled"
                    checked={formData.pph23_enabled}
                    onCheckedChange={(checked: boolean) => handleInputChange('pph23_enabled', checked)}
                  />
                </div>
              </div>
            </div>

            {/* PPh 23 Service Details */}
            {formData.pph23_enabled && (
              <div className="border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="service_value">Service Value (Rp) *</Label>
                    <Input
                      id="service_value"
                      type="number"
                      value={formData.service_value || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleInputChange('service_value', parseFloat(e.target.value) || null)
                      }
                      placeholder="Service value amount"
                      min="0"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service_type">Service Type *</Label>
                    <Input
                      id="service_type"
                      value={formData.service_type || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleInputChange('service_type', e.target.value || null)
                      }
                      placeholder="Type of service"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Buyer NPWP */}
            {(formData.vat_enabled || formData.local_tax_enabled || formData.pph22_enabled || formData.pph23_enabled) && (
              <div className="border-t pt-4">
                <div className="space-y-2">
                  <Label htmlFor="buyer_npwp">Buyer NPWP (Optional)</Label>
                  <Input
                    id="buyer_npwp"
                    value={formData.buyer_npwp || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleInputChange('buyer_npwp', e.target.value || null)
                    }
                    placeholder="XX.XXX.XXX.X-XXX.XXX"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Transaction Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span>Subtotal:</span>
              <span className="font-mono">Rp {totals.subtotal.toLocaleString('id-ID')}</span>
            </div>
            
            {formData.vat_enabled && (
              <div className="flex justify-between items-center text-green-700">
                <span>VAT (11%):</span>
                <span className="font-mono">+ Rp {totals.vatAmount.toLocaleString('id-ID')}</span>
              </div>
            )}
            
            {formData.local_tax_enabled && (
              <div className="flex justify-between items-center text-green-700">
                <span>Local Tax (10%):</span>
                <span className="font-mono">+ Rp {totals.localTaxAmount.toLocaleString('id-ID')}</span>
              </div>
            )}
            
            {totals.stampDutyRequired && (
              <div className="flex justify-between items-center text-blue-700">
                <span>Stamp Duty:</span>
                <span className="font-mono">+ Rp {totals.stampDutyAmount.toLocaleString('id-ID')}</span>
              </div>
            )}
            
            {formData.pph22_enabled && (
              <div className="flex justify-between items-center text-red-700">
                <span>PPh Article 22 (1.5%):</span>
                <span className="font-mono">- Rp {totals.pph22Amount.toLocaleString('id-ID')}</span>
              </div>
            )}
            
            {formData.pph23_enabled && totals.pph23Amount > 0 && (
              <div className="flex justify-between items-center text-red-700">
                <span>PPh Article 23 (2%):</span>
                <span className="font-mono">- Rp {totals.pph23Amount.toLocaleString('id-ID')}</span>
              </div>
            )}
            
            <Separator />
            <div className="flex justify-between items-center font-bold text-lg">
              <span>Total Amount:</span>
              <span className="font-mono">Rp {totals.totalAmount.toLocaleString('id-ID')}</span>
            </div>

            {totals.stampDutyRequired && (
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs">
                  ⚠️ Stamp duty required (total ≥ Rp 5,000,000)
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={isLoading || transactionItems.length === 0}
            className="flex items-center gap-2"
            size="lg"
          >
            <Save className="h-4 w-4" />
            {isLoading ? 'Creating Transaction...' : 'Create Transaction'}
          </Button>
        </div>
      </form>
    </div>
  );
}
