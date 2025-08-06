
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Eye, Printer } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  Transaction, 
  StoreProfile, 
  GenerateDocumentInput
} from '../../../server/src/schema';

interface DocumentGeneratorProps {
  transactions: Transaction[];
  storeProfile: StoreProfile | null;
}

type DocumentType = 'sales_note' | 'payment_receipt' | 'invoice' | 'bast' | 'purchase_order' | 'tax_invoice' | 'proforma_invoice';

const documentTypes: { value: DocumentType; label: string; description: string }[] = [
  { value: 'sales_note', label: '📄 Sales Note', description: 'Basic sales transaction record' },
  { value: 'payment_receipt', label: '🧾 Payment Receipt', description: 'Proof of payment received' },
  { value: 'invoice', label: '📋 Invoice', description: 'Standard invoice document' },
  { value: 'bast', label: '📦 BAST', description: 'Berita Acara Serah Terima (Handover Report)' },
  { value: 'purchase_order', label: '🛒 Purchase Order', description: 'Purchase order document' },
  { value: 'tax_invoice', label: '🧮 Tax Invoice', description: 'Official tax invoice' },
  { value: 'proforma_invoice', label: '📊 Proforma Invoice', description: 'Preliminary invoice' }
];

export function DocumentGenerator({ transactions, storeProfile }: DocumentGeneratorProps) {
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('sales_note');
  const [documentDate, setDocumentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [cityRegency, setCityRegency] = useState<string>('');
  const [courierName, setCourierName] = useState<string>('');
  const [bastRecipient, setBastRecipient] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedDocument, setGeneratedDocument] = useState<string | null>(null);

  const selectedTransaction = transactions.find((t: Transaction) => t.id === selectedTransactionId);
  const selectedDocumentType = documentTypes.find(dt => dt.value === documentType);

  const handleGenerateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTransactionId || !storeProfile) {
      setError('Please select a transaction and ensure store profile is set up.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const input: GenerateDocumentInput = {
        transaction_id: selectedTransactionId,
        document_type: documentType,
        document_date: new Date(documentDate),
        city_regency: cityRegency || undefined,
        courier_name: courierName || undefined,
        bast_recipient: bastRecipient || undefined
      };

      // Note: This is a stub - in real implementation, this would return HTML content
      await trpc.generateDocument.mutate(input);
      setGeneratedDocument(`
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <h1>🧾 ${selectedDocumentType?.label} - PREVIEW</h1>
          <p><strong>⚠️ This is a stub implementation for demonstration purposes.</strong></p>
          <div style="border: 1px solid #ddd; padding: 20px; margin: 20px 0; background: #f9f9f9;">
            <h2>Store Information</h2>
            <p><strong>Store:</strong> ${storeProfile.store_name}</p>
            <p><strong>Address:</strong> ${storeProfile.full_address}</p>
            <p><strong>Phone:</strong> ${storeProfile.phone_number}</p>
            <p><strong>Email:</strong> ${storeProfile.email}</p>
            <p><strong>NPWP:</strong> ${storeProfile.npwp}</p>
          </div>
          <div style="border: 1px solid #ddd; padding: 20px; margin: 20px 0;">
            <h2>Transaction Details</h2>
            <p><strong>Transaction ID:</strong> ${selectedTransaction?.transaction_id}</p>
            <p><strong>Date:</strong> ${selectedTransaction?.transaction_date.toLocaleDateString('id-ID')}</p>
            <p><strong>Customer:</strong> ${selectedTransaction?.customer_name}</p>
            <p><strong>Address:</strong> ${selectedTransaction?.customer_address}</p>
            <p><strong>Total Amount:</strong> Rp ${selectedTransaction?.total_amount.toLocaleString('id-ID')}</p>
          </div>
          <div style="border: 1px solid #ddd; padding: 20px; margin: 20px 0;">
            <h2>Document Settings</h2>
            <p><strong>Document Type:</strong> ${selectedDocumentType?.label}</p>
            <p><strong>Document Date:</strong> ${new Date(documentDate).toLocaleDateString('id-ID')}</p>
            ${cityRegency ? `<p><strong>City/Regency:</strong> ${cityRegency}</p>` : ''}
            ${courierName ? `<p><strong>Courier:</strong> ${courierName}</p>` : ''}
            ${bastRecipient ? `<p><strong>BAST Recipient:</strong> ${bastRecipient}</p>` : ''}
          </div>
        </div>
      `);
    } catch (err) {
      console.error('Failed to generate document:', err);
      setError('Failed to generate document. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!generatedDocument) return;
    
    // This is a stub implementation - in real app, this would convert HTML to PDF
    const blob = new Blob([generatedDocument], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDocumentType?.value}_${selectedTransaction?.transaction_id}_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!storeProfile) {
    return (
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          Please set up your store profile first before generating documents.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Generation Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generate Document
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerateDocument} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="transaction">Select Transaction *</Label>
                <Select 
                  value={selectedTransactionId?.toString() || 'none'} 
                  onValueChange={(value: string) => {
                    if (value === 'none') {
                      setSelectedTransactionId(null);
                    } else {
                      setSelectedTransactionId(parseInt(value));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a transaction..." />
                  </SelectTrigger>
                  <SelectContent>
                    {transactions.length === 0 ? (
                      <SelectItem value="none" disabled>No transactions available</SelectItem>
                    ) : (
                      <>
                        <SelectItem value="none">Choose a transaction...</SelectItem>
                        {transactions.map((transaction: Transaction) => (
                          <SelectItem key={transaction.id} value={transaction.id.toString()}>
                            [{transaction.transaction_id}] {transaction.customer_name} - Rp {transaction.total_amount.toLocaleString('id-ID')}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="document_type">Document Type *</Label>
                <Select value={documentType} onValueChange={(value: DocumentType) => setDocumentType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-gray-500">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="document_date">Document Date</Label>
                <Input
                  id="document_date"
                  type="date"
                  value={documentDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDocumentDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city_regency">City/Regency (Optional)</Label>
                <Input
                  id="city_regency"
                  value={cityRegency}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCityRegency(e.target.value)}
                  placeholder="e.g., Jakarta"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="courier_name">Courier Name (Optional)</Label>
                <Input
                  id="courier_name"
                  value={courierName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCourierName(e.target.value)}
                  placeholder="Name of courier"
                />
              </div>

              {documentType === 'bast' && (
                <div className="space-y-2">
                  <Label htmlFor="bast_recipient">BAST Recipient (Optional)</Label>
                  <Input
                    id="bast_recipient"
                    value={bastRecipient}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBastRecipient(e.target.value)}
                    placeholder="Recipient name for BAST"
                  />
                </div>
              )}

              <Button 
                type="submit" 
                disabled={isGenerating || !selectedTransactionId}
                className="w-full flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                {isGenerating ? 'Generating...' : 'Generate & Preview Document'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Selected Transaction Info */}
        {selectedTransaction && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Selected Transaction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <span className="font-medium text-gray-600">Transaction ID:</span>
                <p className="font-mono">{selectedTransaction.transaction_id}</p>
              </div>
              <div className="text-sm">
                <span className="font-medium text-gray-600">Customer:</span>
                <p>{selectedTransaction.customer_name}</p>
              </div>
              <div className="text-sm">
                <span className="font-medium text-gray-600">Date:</span>
                <p>{selectedTransaction.transaction_date.toLocaleDateString('id-ID')}</p>
              </div>
              <div className="text-sm">
                <span className="font-medium text-gray-600">Total Amount:</span>
                <p className="font-mono text-lg font-bold">Rp {selectedTransaction.total_amount.toLocaleString('id-ID')}</p>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedTransaction.vat_enabled && <Badge variant="secondary" className="text-xs">VAT</Badge>}
                {selectedTransaction.local_tax_enabled && <Badge variant="secondary" className="text-xs">Local Tax</Badge>}
                {selectedTransaction.pph22_enabled && <Badge variant="outline" className="text-xs">PPh22</Badge>}
                {selectedTransaction.pph23_enabled && <Badge variant="outline" className="text-xs">PPh23</Badge>}
                {selectedTransaction.stamp_duty_required && <Badge variant="default" className="text-xs">Stamp Duty</Badge>}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Generated Document Preview */}
      {generatedDocument && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Preview
            </CardTitle>
            <Button 
              onClick={handleDownloadPDF}
              variant="outline" 
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download HTML
            </Button>
          </CardHeader>
          <CardContent>
            <div 
              className="border rounded-lg p-4 bg-white max-h-96 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: generatedDocument }}
            />
            <Alert className="mt-4">
              <Printer className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> This is a stub implementation showing HTML preview. In a real application, 
                this would generate proper PDF documents with professional formatting.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
