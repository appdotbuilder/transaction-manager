
import { db } from '../db';
import { transactionsTable, transactionItemsTable, catalogItemsTable, storeProfilesTable } from '../db/schema';
import { type GenerateDocumentInput } from '../schema';
import { eq } from 'drizzle-orm';

// Helper function to format numbers with comma thousands separator
function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US');
}

export async function generateDocument(input: GenerateDocumentInput): Promise<string> {
  try {
    // Fetch transaction with items
    const transactionResult = await db.select()
      .from(transactionsTable)
      .leftJoin(transactionItemsTable, eq(transactionsTable.id, transactionItemsTable.transaction_id))
      .leftJoin(catalogItemsTable, eq(transactionItemsTable.catalog_item_id, catalogItemsTable.id))
      .where(eq(transactionsTable.id, input.transaction_id))
      .execute();

    if (transactionResult.length === 0) {
      throw new Error('Transaction not found');
    }

    // Get store profile (assuming single store)
    const storeProfileResult = await db.select()
      .from(storeProfilesTable)
      .limit(1)
      .execute();

    const storeProfile = storeProfileResult[0] || null;

    // Parse transaction data
    const transaction = {
      ...transactionResult[0].transactions,
      subtotal: parseFloat(transactionResult[0].transactions.subtotal),
      vat_amount: parseFloat(transactionResult[0].transactions.vat_amount),
      local_tax_amount: parseFloat(transactionResult[0].transactions.local_tax_amount),
      pph22_amount: parseFloat(transactionResult[0].transactions.pph22_amount),
      pph23_amount: parseFloat(transactionResult[0].transactions.pph23_amount),
      service_value: transactionResult[0].transactions.service_value ? parseFloat(transactionResult[0].transactions.service_value) : null,
      stamp_duty_amount: parseFloat(transactionResult[0].transactions.stamp_duty_amount),
      total_amount: parseFloat(transactionResult[0].transactions.total_amount)
    };

    // Parse transaction items
    const items = transactionResult
      .filter(row => row.transaction_items !== null)
      .map(row => ({
        ...row.transaction_items!,
        quantity: parseFloat(row.transaction_items!.quantity),
        unit_price: parseFloat(row.transaction_items!.unit_price),
        discount: parseFloat(row.transaction_items!.discount),
        line_total: parseFloat(row.transaction_items!.line_total)
      }));

    // Use provided date or transaction date
    const documentDate = input.document_date || transaction.transaction_date;
    const cityRegency = input.city_regency || 'Jakarta';
    const courierName = input.courier_name || transaction.courier || '';
    const bastRecipient = input.bast_recipient || transaction.customer_name;

    // Generate HTML based on document type
    switch (input.document_type) {
      case 'sales_note':
        return generateSalesNote(transaction, items, storeProfile, documentDate, cityRegency);
      
      case 'payment_receipt':
        return generatePaymentReceipt(transaction, items, storeProfile, documentDate, cityRegency);
      
      case 'invoice':
        return generateInvoice(transaction, items, storeProfile, documentDate, cityRegency);
      
      case 'bast':
        return generateBast(transaction, items, storeProfile, documentDate, cityRegency, bastRecipient, courierName);
      
      case 'purchase_order':
        return generatePurchaseOrder(transaction, items, storeProfile, documentDate, cityRegency);
      
      case 'tax_invoice':
        return generateTaxInvoice(transaction, items, storeProfile, documentDate, cityRegency);
      
      case 'proforma_invoice':
        return generateProformaInvoice(transaction, items, storeProfile, documentDate, cityRegency);
      
      default:
        throw new Error(`Unsupported document type: ${input.document_type}`);
    }
  } catch (error) {
    console.error('Document generation failed:', error);
    throw error;
  }
}

function generateSalesNote(transaction: any, items: any[], storeProfile: any, documentDate: Date, cityRegency: string): string {
  const itemsHtml = items.map(item => `
    <tr>
      <td>${item.item_code}</td>
      <td>${item.item_name}</td>
      <td>${item.quantity}</td>
      <td>Rp ${formatCurrency(item.unit_price)}</td>
      <td>${item.discount}%</td>
      <td>Rp ${formatCurrency(item.line_total)}</td>
    </tr>
  `).join('');

  return `
    <html>
      <head>
        <title>Sales Note - ${transaction.transaction_id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .header { text-align: center; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>SALES NOTE</h2>
          ${storeProfile ? `<h3>${storeProfile.store_name}</h3>` : ''}
          ${storeProfile ? `<p>${storeProfile.full_address}</p>` : ''}
          ${storeProfile ? `<p>Phone: ${storeProfile.phone_number} | Email: ${storeProfile.email}</p>` : ''}
        </div>
        
        <table>
          <tr>
            <td><strong>Transaction ID:</strong></td>
            <td>${transaction.transaction_id}</td>
            <td><strong>Date:</strong></td>
            <td>${documentDate.toLocaleDateString('id-ID')}</td>
          </tr>
          <tr>
            <td><strong>Customer:</strong></td>
            <td>${transaction.customer_name}</td>
            <td><strong>City:</strong></td>
            <td>${cityRegency}</td>
          </tr>
          <tr>
            <td><strong>Address:</strong></td>
            <td colspan="3">${transaction.customer_address}</td>
          </tr>
        </table>

        <h4>Items:</h4>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Discount</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <table style="margin-top: 20px;">
          <tr>
            <td><strong>Subtotal:</strong></td>
            <td>Rp ${formatCurrency(transaction.subtotal)}</td>
          </tr>
          <tr>
            <td><strong>Total Amount:</strong></td>
            <td><strong>Rp ${formatCurrency(transaction.total_amount)}</strong></td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function generatePaymentReceipt(transaction: any, items: any[], storeProfile: any, documentDate: Date, cityRegency: string): string {
  return `
    <html>
      <head>
        <title>Payment Receipt - ${transaction.transaction_id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .header { text-align: center; margin-bottom: 20px; }
          .signature { margin-top: 40px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>PAYMENT RECEIPT</h2>
          ${storeProfile ? `<h3>${storeProfile.store_name}</h3>` : ''}
        </div>
        
        <p>Received from: <strong>${transaction.customer_name}</strong></p>
        <p>Amount: <strong>Rp ${formatCurrency(transaction.total_amount)}</strong></p>
        <p>For: Transaction ${transaction.transaction_id}</p>
        <p>Date: ${documentDate.toLocaleDateString('id-ID')}</p>
        <p>City: ${cityRegency}</p>
        
        <div class="signature">
          <p>Received by:</p>
          <br><br>
          <p>${transaction.treasurer_principal_name}</p>
        </div>
      </body>
    </html>
  `;
}

function generateInvoice(transaction: any, items: any[], storeProfile: any, documentDate: Date, cityRegency: string): string {
  const itemsHtml = items.map(item => `
    <tr>
      <td>${item.item_code}</td>
      <td>${item.item_name}</td>
      <td>${item.quantity}</td>
      <td>Rp ${formatCurrency(item.unit_price)}</td>
      <td>Rp ${formatCurrency(item.line_total)}</td>
    </tr>
  `).join('');

  return `
    <html>
      <head>
        <title>Invoice - ${transaction.transaction_id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .header { text-align: center; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>INVOICE</h2>
          ${storeProfile ? `<h3>${storeProfile.store_name}</h3>` : ''}
          ${storeProfile ? `<p>NPWP: ${storeProfile.npwp}</p>` : ''}
        </div>
        
        <table>
          <tr>
            <td><strong>Invoice No:</strong></td>
            <td>${transaction.transaction_id}</td>
            <td><strong>Date:</strong></td>
            <td>${documentDate.toLocaleDateString('id-ID')}</td>
          </tr>
          <tr>
            <td><strong>Bill To:</strong></td>
            <td colspan="3">${transaction.customer_name}<br>${transaction.customer_address}</td>
          </tr>
        </table>

        <table>
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Description</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <table style="margin-top: 20px;">
          <tr>
            <td><strong>Subtotal:</strong></td>
            <td>Rp ${formatCurrency(transaction.subtotal)}</td>
          </tr>
          ${transaction.vat_enabled ? `
          <tr>
            <td><strong>VAT:</strong></td>
            <td>Rp ${formatCurrency(transaction.vat_amount)}</td>
          </tr>
          ` : ''}
          <tr>
            <td><strong>Total Amount:</strong></td>
            <td><strong>Rp ${formatCurrency(transaction.total_amount)}</strong></td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function generateBast(transaction: any, items: any[], storeProfile: any, documentDate: Date, cityRegency: string, bastRecipient: string, courierName: string): string {
  const itemsHtml = items.map(item => `
    <tr>
      <td>${item.item_name}</td>
      <td>${item.quantity}</td>
      <td>Good condition</td>
    </tr>
  `).join('');

  return `
    <html>
      <head>
        <title>BAST - ${transaction.transaction_id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .header { text-align: center; margin-bottom: 20px; }
          .signature { margin-top: 40px; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>BERITA ACARA SERAH TERIMA (BAST)</h2>
          <p>Transaction: ${transaction.transaction_id}</p>
          <p>Date: ${documentDate.toLocaleDateString('id-ID')}</p>
          <p>City: ${cityRegency}</p>
        </div>
        
        <p>We hereby confirm the delivery and receipt of the following items:</p>

        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th>Quantity</th>
              <th>Condition</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <p>Delivered to: <strong>${bastRecipient}</strong></p>
        <p>Address: ${transaction.customer_address}</p>
        ${courierName ? `<p>Courier: ${courierName}</p>` : ''}

        <div class="signature">
          <div>
            <p>Delivered by:</p>
            <br><br>
            <p>${transaction.treasurer_principal_name}</p>
          </div>
          <div>
            <p>Received by:</p>
            <br><br>
            <p>${bastRecipient}</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generatePurchaseOrder(transaction: any, items: any[], storeProfile: any, documentDate: Date, cityRegency: string): string {
  const itemsHtml = items.map(item => `
    <tr>
      <td>${item.item_code}</td>
      <td>${item.item_name}</td>
      <td>${item.quantity}</td>
      <td>Rp ${formatCurrency(item.unit_price)}</td>
      <td>Rp ${formatCurrency(item.line_total)}</td>
    </tr>
  `).join('');

  return `
    <html>
      <head>
        <title>Purchase Order - ${transaction.transaction_id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .header { text-align: center; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>PURCHASE ORDER</h2>
          ${storeProfile ? `<h3>${storeProfile.store_name}</h3>` : ''}
        </div>
        
        <table>
          <tr>
            <td><strong>PO Number:</strong></td>
            <td>${transaction.transaction_id}</td>
            <td><strong>Date:</strong></td>
            <td>${documentDate.toLocaleDateString('id-ID')}</td>
          </tr>
          <tr>
            <td><strong>Vendor:</strong></td>
            <td colspan="3">${transaction.customer_name}<br>${transaction.customer_address}</td>
          </tr>
        </table>

        <table>
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Description</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <table style="margin-top: 20px;">
          <tr>
            <td><strong>Total Amount:</strong></td>
            <td><strong>Rp ${formatCurrency(transaction.total_amount)}</strong></td>
          </tr>
        </table>

        <p style="margin-top: 30px;">Authorized by: ${transaction.treasurer_principal_name}</p>
      </body>
    </html>
  `;
}

function generateTaxInvoice(transaction: any, items: any[], storeProfile: any, documentDate: Date, cityRegency: string): string {
  const itemsHtml = items.map(item => `
    <tr>
      <td>${item.item_code}</td>
      <td>${item.item_name}</td>
      <td>${item.quantity}</td>
      <td>Rp ${formatCurrency(item.unit_price)}</td>
      <td>Rp ${formatCurrency(item.line_total)}</td>
    </tr>
  `).join('');

  return `
    <html>
      <head>
        <title>Tax Invoice - ${transaction.transaction_id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .header { text-align: center; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>FAKTUR PAJAK (TAX INVOICE)</h2>
          ${storeProfile ? `<h3>${storeProfile.store_name}</h3>` : ''}
          ${storeProfile ? `<p>NPWP: ${storeProfile.npwp}</p>` : ''}
        </div>
        
        <table>
          <tr>
            <td><strong>Invoice No:</strong></td>
            <td>${transaction.transaction_id}</td>
            <td><strong>Date:</strong></td>
            <td>${documentDate.toLocaleDateString('id-ID')}</td>
          </tr>
          <tr>
            <td><strong>Customer NPWP:</strong></td>
            <td>${transaction.buyer_npwp || 'N/A'}</td>
            <td><strong>City:</strong></td>
            <td>${cityRegency}</td>
          </tr>
          <tr>
            <td><strong>Customer:</strong></td>
            <td colspan="3">${transaction.customer_name}<br>${transaction.customer_address}</td>
          </tr>
        </table>

        <table>
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Description</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <table style="margin-top: 20px;">
          <tr>
            <td><strong>Subtotal (DPP):</strong></td>
            <td>Rp ${formatCurrency(transaction.subtotal)}</td>
          </tr>
          <tr>
            <td><strong>VAT (11%):</strong></td>
            <td>Rp ${formatCurrency(transaction.vat_amount)}</td>
          </tr>
          ${transaction.local_tax_enabled ? `
          <tr>
            <td><strong>Local Tax:</strong></td>
            <td>Rp ${formatCurrency(transaction.local_tax_amount)}</td>
          </tr>
          ` : ''}
          ${transaction.pph22_enabled ? `
          <tr>
            <td><strong>PPh 22:</strong></td>
            <td>Rp ${formatCurrency(transaction.pph22_amount)}</td>
          </tr>
          ` : ''}
          ${transaction.pph23_enabled ? `
          <tr>
            <td><strong>PPh 23:</strong></td>
            <td>Rp ${formatCurrency(transaction.pph23_amount)}</td>
          </tr>
          ` : ''}
          <tr>
            <td><strong>Total Amount:</strong></td>
            <td><strong>Rp ${formatCurrency(transaction.total_amount)}</strong></td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function generateProformaInvoice(transaction: any, items: any[], storeProfile: any, documentDate: Date, cityRegency: string): string {
  const itemsHtml = items.map(item => `
    <tr>
      <td>${item.item_code}</td>
      <td>${item.item_name}</td>
      <td>${item.quantity}</td>
      <td>Rp ${formatCurrency(item.unit_price)}</td>
      <td>Rp ${formatCurrency(item.line_total)}</td>
    </tr>
  `).join('');

  return `
    <html>
      <head>
        <title>Proforma Invoice - ${transaction.transaction_id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .header { text-align: center; margin-bottom: 20px; }
          .watermark { color: #ccc; font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>PROFORMA INVOICE</h2>
          ${storeProfile ? `<h3>${storeProfile.store_name}</h3>` : ''}
        </div>
        
        <div class="watermark">*** PROFORMA - NOT FOR PAYMENT ***</div>
        
        <table>
          <tr>
            <td><strong>Proforma No:</strong></td>
            <td>${transaction.transaction_id}</td>
            <td><strong>Date:</strong></td>
            <td>${documentDate.toLocaleDateString('id-ID')}</td>
          </tr>
          <tr>
            <td><strong>Customer:</strong></td>
            <td colspan="3">${transaction.customer_name}<br>${transaction.customer_address}</td>
          </tr>
        </table>

        <table>
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Description</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <table style="margin-top: 20px;">
          <tr>
            <td><strong>Subtotal:</strong></td>
            <td>Rp ${formatCurrency(transaction.subtotal)}</td>
          </tr>
          <tr>
            <td><strong>Estimated Total:</strong></td>
            <td><strong>Rp ${formatCurrency(transaction.total_amount)}</strong></td>
          </tr>
        </table>
        
        <p style="margin-top: 20px; font-style: italic;">
          This is a proforma invoice for quotation purposes only. 
          Final invoice will be issued upon confirmation of order.
        </p>
      </body>
    </html>
  `;
}
