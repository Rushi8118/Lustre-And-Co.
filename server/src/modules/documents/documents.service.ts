import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service.js';
import { SettingsService } from '../settings/settings.service.js';
import type {
  CompanyLegalDetails,
  CreditNoteDocument,
  DocumentAddress,
  DocumentItem,
  InvoiceDocument,
  PackingSlipDocument,
  RefundReceiptDocument,
  ShippingLabelDocument,
  OrderSummaryDocument,
  TaxBreakdown,
} from './schemas/document.schema.js';

const STATE_CODE_MAP: Record<string, string> = {
  maharashtra: '27',
  delhi: '07',
  karnataka: '29',
  gujarat: '24',
  tamilnadu: '33',
  'tamil nadu': '33',
  telangana: '36',
  'west bengal': '19',
  rajasthan: '08',
  'uttar pradesh': '09',
  kerala: '32',
  punjab: '03',
  haryana: '06',
  bihar: '10',
  'madhya pradesh': '23',
  goa: '30',
  odisha: '21',
  assam: '18',
  chandigarh: '04',
  jharkhand: '20',
  uttarakhand: '05',
  chhattisgarh: '22',
  'andhra pradesh': '37',
  'himachal pradesh': '02',
};

function numberToWords(amount: number): string {
  const units = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  function convertSection(num: number): string {
    let str = '';
    if (num >= 100) {
      str += units[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    if (num >= 20) {
      str += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    }
    if (num > 0) {
      str += units[num] + ' ';
    }
    return str.trim();
  }

  const rounded = Math.round(amount);
  if (rounded === 0) return 'Rupees Zero Only';

  let remaining = rounded;
  let words = '';

  const crore = Math.floor(remaining / 10000000);
  remaining %= 10000000;
  if (crore > 0) words += convertSection(crore) + ' Crore ';

  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;
  if (lakh > 0) words += convertSection(lakh) + ' Lakh ';

  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;
  if (thousand > 0) words += convertSection(thousand) + ' Thousand ';

  const hundreds = remaining;
  if (hundreds > 0) words += convertSection(hundreds) + ' ';

  return `Rupees ${words.trim()} Only`;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @Inject(SupabaseService) private readonly db: SupabaseService,
    @Inject(SettingsService) private readonly settingsService: SettingsService,
  ) {}

  async getCompanyLegalDetails(): Promise<CompanyLegalDetails> {
    const storeSettings = await this.settingsService.get();
    const store = storeSettings.store || {};

    return {
      companyName:
        process.env.COMPANY_LEGAL_NAME ||
        'Lustre & Co. Luxury Jewels Private Limited',
      brandName: store.name || 'Lustre & Co.',
      cin: process.env.COMPANY_CIN || 'U36911MH2024PTC123456',
      gstin: process.env.COMPANY_GSTIN || '27AABCL1234F1Z8',
      pan: process.env.COMPANY_PAN || 'AABCL1234F',
      registeredAddress:
        process.env.COMPANY_REGISTERED_ADDRESS ||
        '104, Zaveri Bazaar, Kalbadevi, Mumbai, Maharashtra 400002, India',
      city: process.env.COMPANY_CITY || 'Mumbai',
      state: process.env.COMPANY_STATE || 'Maharashtra',
      stateCode: process.env.COMPANY_STATE_CODE || '27',
      postalCode: process.env.COMPANY_PINCODE || '400002',
      country: 'India',
      supportEmail: store.supportEmail || 'concierge@lustreandco.com',
      supportPhone: store.supportPhone || '+91 (555) 234-5878',
      website: process.env.STOREFRONT_URL || 'https://lustreandco.com',
      bankDetails: {
        accountName: 'Lustre & Co. Luxury Jewels Pvt. Ltd.',
        accountNumber: '924020054321890',
        bankName: 'HDFC Bank Ltd.',
        ifsc: 'HDFC0000060',
        branch: 'Zaveri Bazaar, Mumbai',
      },
    };
  }

  private getStateCode(stateName?: string): string {
    if (!stateName) return '27';
    const key = stateName.toLowerCase().trim();
    return STATE_CODE_MAP[key] || '27';
  }

  private async getNextSequenceNumber(
    docType: string,
    prefix: string,
  ): Promise<string> {
    const currentYear = new Date().getFullYear();

    try {
      const { data, error } = await this.db.rpc(
        'get_next_document_number',
        {
          p_doc_type: docType,
          p_year: currentYear,
          p_prefix: prefix,
        },
      );

      if (!error && data) return data as string;
    } catch {
      // Fallback if RPC is not present
    }

    const seqId = `${docType}-${currentYear}`;
    const { data: current } = await this.db
      .from('document_sequences')
      .select('last_number')
      .eq('id', seqId)
      .maybeSingle();

    const nextNum = (current?.last_number || 0) + 1;

    await this.db.from('document_sequences').upsert({
      id: seqId,
      doc_type: docType,
      year: currentYear,
      last_number: nextNum,
      updated_at: new Date().toISOString(),
    });

    return `${prefix}-${currentYear}-${String(nextNum).padStart(4, '0')}`;
  }

  private calculateTaxBreakdown(
    taxableAmount: number,
    destState?: string,
    taxPercent = 3.0,
  ): TaxBreakdown {
    const sellerStateCode = '27'; // Maharashtra
    const buyerStateCode = this.getStateCode(destState);
    const isInterstate = buyerStateCode !== sellerStateCode;

    if (isInterstate) {
      const igstAmount = Number(
        ((taxableAmount * taxPercent) / 100).toFixed(2),
      );
      return {
        taxableAmount,
        cgstRate: 0,
        cgstAmount: 0,
        sgstRate: 0,
        sgstAmount: 0,
        igstRate: taxPercent,
        igstAmount,
        totalTax: igstAmount,
        isInterstate: true,
      };
    } else {
      const halfRate = Number((taxPercent / 2).toFixed(2));
      const cgstAmount = Number(
        ((taxableAmount * halfRate) / 100).toFixed(2),
      );
      const sgstAmount = Number(
        ((taxableAmount * halfRate) / 100).toFixed(2),
      );
      return {
        taxableAmount,
        cgstRate: halfRate,
        cgstAmount,
        sgstRate: halfRate,
        sgstAmount,
        igstRate: 0,
        igstAmount: 0,
        totalTax: Number((cgstAmount + sgstAmount).toFixed(2)),
        isInterstate: false,
      };
    }
  }

  async getOrder(orderIdOrNumber: string) {
    const trimmed = orderIdOrNumber.trim();
    const isId =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        trimmed,
      );

    const query = this.db.from('orders').select('*');
    const { data, error } = await (isId
      ? query.or(`id.eq.${trimmed},orderId.eq.${trimmed}`).maybeSingle()
      : query.eq('orderId', trimmed).maybeSingle());

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Order not found.');
    return data;
  }

  async generateInvoice(orderIdentifier: string): Promise<InvoiceDocument> {
    const order = await this.getOrder(orderIdentifier);
    const company = await this.getCompanyLegalDetails();

    // Check if an invoice already exists for this order
    const { data: existing } = await this.db
      .from('order_invoices')
      .select('*')
      .eq('order_id', order.id)
      .eq('invoice_type', 'tax_invoice')
      .maybeSingle();

    if (existing) {
      return this.mapInvoiceRecord(existing, company);
    }

    const invoiceNumber = await this.getNextSequenceNumber(
      'invoice',
      'INV',
    );

    const rawShipping = order.shippingAddress || {};
    const buyerState = rawShipping.state || 'Maharashtra';
    const buyerStateCode = this.getStateCode(buyerState);

    const buyer: DocumentAddress = {
      fullName:
        order.customer?.fullName ||
        order.customer?.name ||
        'Valued Customer',
      email: order.customer?.email,
      phone: order.customer?.phone,
      addressLine1: rawShipping.address || '',
      city: rawShipping.city || '',
      state: buyerState,
      stateCode: buyerStateCode,
      postalCode: rawShipping.postalCode || '',
      country: rawShipping.country || 'India',
    };

    const rawItems: any[] = order.items || [];
    const taxPercent = Number(order.tax ? 3.0 : 0);

    const documentItems: DocumentItem[] = rawItems.map(
      (item, idx) => {
        const qty = Number(item.quantity || 1);
        const unitPrice = Number(item.price || 0);
        const lineTotal = unitPrice * qty;
        const hsnCode = '7117.90'; // Imitation Jewellery

        return {
          sNo: idx + 1,
          productId: item.productId || item.product || String(idx),
          name: item.name || 'Jewelry Piece',
          color: item.color,
          size: item.size,
          hsnCode,
          quantity: qty,
          unitPrice,
          discount: 0,
          taxableValue: lineTotal,
          gstRate: taxPercent,
          totalAmount: lineTotal,
        };
      },
    );

    const subtotal = Number(order.subtotal || 0);
    const discount = Number(order.discount || 0);
    const shippingFee = Number(
      order.shippingFee || order.shipping_cost || 0,
    );
    const taxableAmount = Math.max(0, subtotal - discount);

    const taxBreakdown = this.calculateTaxBreakdown(
      taxableAmount,
      buyerState,
      taxPercent,
    );

    const grandTotal = Number(
      order.total || taxableAmount + taxBreakdown.totalTax + shippingFee,
    );
    const words = numberToWords(grandTotal);

    const invoiceDate = order.createdAt || new Date().toISOString();

    const insertPayload = {
      invoice_number: invoiceNumber,
      order_id: order.id,
      order_number: order.orderId || order.id,
      invoice_date: invoiceDate,
      invoice_type: 'tax_invoice',
      seller_details: company,
      buyer_details: buyer,
      shipping_address: buyer,
      billing_address: buyer,
      items: documentItems,
      subtotal,
      discount,
      shipping_fee: shippingFee,
      taxable_amount: taxableAmount,
      cgst_rate: taxBreakdown.cgstRate,
      cgst_amount: taxBreakdown.cgstAmount,
      sgst_rate: taxBreakdown.sgstRate,
      sgst_amount: taxBreakdown.sgstAmount,
      igst_rate: taxBreakdown.igstRate,
      igst_amount: taxBreakdown.igstAmount,
      total_tax: taxBreakdown.totalTax,
      total_amount: grandTotal,
      amount_in_words: words,
      payment_details: order.payment || {},
      status: order.payment?.status === 'paid' ? 'paid' : 'issued',
    };

    const { data: created, error } = await this.db
      .from('order_invoices')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      this.logger.error(`Invoice creation failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }

    // Attach invoice number to order
    await this.db
      .from('orders')
      .update({
        invoice_number: invoiceNumber,
        invoice_id: created.id,
      })
      .eq('id', order.id);

    return this.mapInvoiceRecord(created, company);
  }

  private mapInvoiceRecord(
    row: any,
    company: CompanyLegalDetails,
  ): InvoiceDocument {
    return {
      id: row.id,
      invoiceNumber: row.invoice_number,
      invoiceDate: row.invoice_date,
      invoiceType: row.invoice_type,
      orderId: row.order_id,
      orderNumber: row.order_number,
      orderDate: row.invoice_date,
      seller: row.seller_details || company,
      buyer: row.buyer_details,
      shippingAddress: row.shipping_address,
      billingAddress: row.billing_address,
      items: row.items || [],
      subtotal: Number(row.subtotal || 0),
      discount: Number(row.discount || 0),
      shippingFee: Number(row.shipping_fee || 0),
      taxBreakdown: {
        taxableAmount: Number(row.taxable_amount || 0),
        cgstRate: Number(row.cgst_rate || 0),
        cgstAmount: Number(row.cgst_amount || 0),
        sgstRate: Number(row.sgst_rate || 0),
        sgstAmount: Number(row.sgst_amount || 0),
        igstRate: Number(row.igst_rate || 0),
        igstAmount: Number(row.igst_amount || 0),
        totalTax: Number(row.total_tax || 0),
        isInterstate: Number(row.igst_amount || 0) > 0,
      },
      grandTotal: Number(row.total_amount || 0),
      amountInWords: row.amount_in_words || '',
      payment: row.payment_details || {},
      status: row.status,
      notes: row.notes,
    };
  }

  async generatePackingSlip(
    orderIdentifier: string,
  ): Promise<PackingSlipDocument> {
    const order = await this.getOrder(orderIdentifier);
    const company = await this.getCompanyLegalDetails();

    const rawShipping = order.shippingAddress || {};
    const buyer: DocumentAddress = {
      fullName:
        order.customer?.fullName ||
        order.customer?.name ||
        'Valued Customer',
      phone: order.customer?.phone,
      addressLine1: rawShipping.address || '',
      city: rawShipping.city || '',
      state: rawShipping.state || '',
      postalCode: rawShipping.postalCode || '',
      country: rawShipping.country || 'India',
    };

    const items = (order.items || []).map((item: any, idx: number) => ({
      sNo: idx + 1,
      name: item.name || 'Jewelry Piece',
      sku: item.sku || `LST-${item.color || 'GLD'}-${item.size || 'STD'}`,
      color: item.color,
      size: item.size,
      quantity: Number(item.quantity || 1),
      weightGrams: Number(item.weightGrams || 150),
    }));

    const totalItems = items.reduce(
      (sum: number, i: any) => sum + i.quantity,
      0,
    );
    const totalWeightGrams = items.reduce(
      (sum: number, i: any) => sum + i.weightGrams * i.quantity,
      0,
    );

    const packingSlipNumber = `PACK-${order.orderId || order.id}`;

    return {
      packingSlipNumber,
      generatedAt: new Date().toISOString(),
      orderId: order.id,
      orderNumber: order.orderId || order.id,
      orderDate: order.createdAt || new Date().toISOString(),
      carrier: order.carrier || 'Lustre Express Logistics',
      trackingNumber: order.trackingNumber || undefined,
      shippingMethod:
        order.deliveryOption === 'express'
          ? 'Priority Air Express'
          : 'Standard Delivery',
      sender: company,
      recipient: buyer,
      items,
      totalItems,
      totalWeightGrams: Math.max(250, totalWeightGrams),
      specialInstructions:
        order.notes ||
        'Handle with care. Luxury jewelry in gift packaging. Do not bend or expose to moisture.',
    };
  }

  async generateCreditNote(returnId: string): Promise<CreditNoteDocument> {
    const { data: ret, error } = await this.db
      .from('order_returns')
      .select('*')
      .eq('id', returnId)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!ret) throw new NotFoundException('Return record not found.');

    const company = await this.getCompanyLegalDetails();
    const order = await this.getOrder(ret.order_id);

    // Retrieve or generate parent invoice
    const invoice = await this.generateInvoice(order.id);

    const creditNoteNumber =
      ret.credit_note_number ||
      (await this.getNextSequenceNumber('credit_note', 'CN'));

    const refundAmount = Number(
      ret.actual_refund_amount || ret.calculated_refund_amount || 0,
    );

    const buyerState =
      ret.pickup_address?.state ||
      order.shippingAddress?.state ||
      'Maharashtra';
    const taxAdjustment = this.calculateTaxBreakdown(
      refundAmount,
      buyerState,
      3.0,
    );

    const items: DocumentItem[] = (ret.items || []).map(
      (item: any, idx: number) => ({
        sNo: idx + 1,
        productId: item.productId || String(idx),
        name: item.name,
        color: item.color,
        size: item.size,
        hsnCode: '7117.90',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: 0,
        taxableValue: item.subtotal || item.unitPrice * item.quantity,
        gstRate: 3.0,
        totalAmount: item.subtotal || item.unitPrice * item.quantity,
      }),
    );

    const creditNote: CreditNoteDocument = {
      id: ret.credit_note_id || ret.id,
      creditNoteNumber,
      creditNoteDate: ret.resolved_at || new Date().toISOString(),
      originalInvoiceNumber: invoice.invoiceNumber,
      originalInvoiceDate: invoice.invoiceDate,
      returnNumber: ret.return_number,
      orderId: order.id,
      orderNumber: ret.order_number,
      seller: company,
      buyer: invoice.buyer,
      items,
      reason: ret.reason,
      refundAmount,
      taxAdjustment,
      amountInWords: numberToWords(refundAmount),
      refundMethod:
        ret.refund_preference === 'store_credit'
          ? 'Store Credit / Wallet Points'
          : ret.refund_method || 'Original Payment Source',
    };

    // Store in order_invoices table as credit_note
    await this.db
      .from('order_invoices')
      .upsert(
        {
          invoice_number: creditNoteNumber,
          order_id: order.id,
          order_number: ret.order_number,
          invoice_type: 'credit_note',
          parent_invoice_id: invoice.id,
          return_id: ret.id,
          seller_details: company,
          buyer_details: invoice.buyer,
          shipping_address: invoice.shippingAddress,
          billing_address: invoice.billingAddress,
          items,
          subtotal: refundAmount,
          taxable_amount: taxAdjustment.taxableAmount,
          total_tax: taxAdjustment.totalTax,
          total_amount: refundAmount,
          amount_in_words: creditNote.amountInWords,
          status: 'issued',
          notes: `Credit Note against Return ${ret.return_number}. Reason: ${ret.reason}`,
        },
        { onConflict: 'invoice_number' },
      );

    await this.db
      .from('order_returns')
      .update({
        credit_note_number: creditNoteNumber,
      })
      .eq('id', ret.id);

    return creditNote;
  }

  async generateRefundReceipt(
    returnId: string,
  ): Promise<RefundReceiptDocument> {
    const { data: ret, error } = await this.db
      .from('order_returns')
      .select('*')
      .eq('id', returnId)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!ret) throw new NotFoundException('Return record not found.');

    const company = await this.getCompanyLegalDetails();
    const receiptNumber = `REF-${ret.return_number.replace(/^RET-|^EXC-/, '')}`;

    const refundAmount = Number(
      ret.actual_refund_amount || ret.calculated_refund_amount || 0,
    );
    const itemTotal = Number(ret.calculated_refund_amount || refundAmount);
    const restocking = Number(ret.restocking_fee || 0);

    return {
      receiptNumber,
      receiptDate: ret.resolved_at || new Date().toISOString(),
      returnNumber: ret.return_number,
      orderNumber: ret.order_number,
      customerName: ret.customer?.name || 'Customer',
      customerEmail: ret.customer?.email || '',
      refundAmount,
      refundMethod:
        ret.refund_preference === 'store_credit'
          ? 'Store Credit / Wallet'
          : ret.refund_method || 'Original Payment Mode',
      transactionId: ret.refund_transaction_id || undefined,
      refundStatus: ret.refund_status || 'Completed',
      breakdown: {
        itemTotalRefund: itemTotal,
        restockingFeeDeduction: restocking,
        bonusStoreCredit:
          ret.refund_preference === 'store_credit'
            ? Number(
                (
                  (itemTotal * (ret.store_credit_bonus_percent || 5)) /
                  100
                ).toFixed(2),
              )
            : 0,
        netRefunded: refundAmount,
      },
      company,
    };
  }

  // HTML DOCUMENT RENDERERS (Clean, Print-optimized, High-DPI styling)

  async getInvoiceHtml(orderIdentifier: string): Promise<string> {
    const inv = await this.generateInvoice(orderIdentifier);
    const tax = inv.taxBreakdown;

    const itemRows = inv.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e5e5; text-align: center; font-size: 13px;">${item.sNo}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e5e5; font-size: 13px;">
          <strong>${item.name}</strong>
          ${item.color || item.size ? `<br><small style="color: #666;">Variant: ${[item.color, item.size].filter(Boolean).join(' / ')}</small>` : ''}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e5e5; text-align: center; font-size: 13px; font-family: monospace;">${item.hsnCode}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e5e5; text-align: center; font-size: 13px;">${item.quantity}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e5e5; text-align: right; font-size: 13px;">₹${item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e5e5; text-align: right; font-size: 13px; font-weight: 600;">₹${item.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    `,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice - ${inv.invoiceNumber}</title>
  <style>
    @page { size: A4; margin: 14mm 12mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1a1714;
      line-height: 1.45;
      margin: 0;
      padding: 24px;
      background: #fff;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid #e2dcd2;
      border-radius: 8px;
      padding: 32px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.04);
    }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .brand-title { font-family: 'Cinzel', 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 700; color: #1a1714; letter-spacing: 1px; }
    .badge-tax { display: inline-block; background: #fbf6ee; border: 1px solid #d4af37; color: #8a6d3b; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    .details-box { background: #faf8f5; border: 1px solid #ede8e0; border-radius: 6px; padding: 14px; font-size: 13px; }
    .details-box h4 { margin: 0 0 8px 0; font-size: 12px; color: #8a6d3b; text-transform: uppercase; letter-spacing: 0.5px; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .items-table th { background: #1a1714; color: #fff; font-size: 12px; text-transform: uppercase; padding: 10px 12px; font-weight: 600; letter-spacing: 0.5px; }
    .totals-table { width: 340px; margin-left: auto; border-collapse: collapse; font-size: 13px; margin-bottom: 24px; }
    .totals-table td { padding: 6px 10px; }
    .totals-table tr.grand-total { background: #fbf6ee; font-size: 16px; font-weight: 700; border-top: 2px solid #d4af37; border-bottom: 2px solid #d4af37; color: #1a1714; }
    .legal-footer { margin-top: 32px; padding-top: 16px; border-top: 1px dashed #d1c7b7; font-size: 11px; color: #666; text-align: center; }
    .btn-print { background: #1a1714; color: #fff; border: none; padding: 10px 20px; font-size: 14px; border-radius: 6px; cursor: pointer; font-weight: 600; }
    @media print {
      body { padding: 0; background: none; }
      .invoice-card { border: none; box-shadow: none; padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div style="text-align: right; max-width: 800px; margin: 0 auto 16px auto;" class="no-print">
    <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>

  <div class="invoice-card">
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <div class="brand-title">${inv.seller.brandName}</div>
          <div style="font-size: 12px; color: #666; margin-top: 4px;">${inv.seller.companyName}</div>
          <div style="font-size: 11px; color: #777; margin-top: 2px;">
            CIN: <strong>${inv.seller.cin}</strong> | GSTIN: <strong>${inv.seller.gstin}</strong><br>
            State: ${inv.seller.state} (Code: ${inv.seller.stateCode})
          </div>
        </td>
        <td style="vertical-align: top; text-align: right;">
          <span class="badge-tax">ORIGINAL FOR RECIPIENT</span>
          <h2 style="margin: 8px 0 2px 0; font-size: 20px; color: #1a1714;">TAX INVOICE</h2>
          <div style="font-size: 14px; font-weight: 700; color: #8a6d3b; font-family: monospace;">${inv.invoiceNumber}</div>
          <div style="font-size: 12px; color: #666; margin-top: 4px;">
            Date: <strong>${new Date(inv.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong><br>
            Order ID: <strong>${inv.orderNumber}</strong>
          </div>
        </td>
      </tr>
    </table>

    <div class="details-grid">
      <div class="details-box">
        <h4>Sold By (Billed From)</h4>
        <strong>${inv.seller.companyName}</strong><br>
        ${inv.seller.registeredAddress}<br>
        Email: ${inv.seller.supportEmail}<br>
        Phone: ${inv.seller.supportPhone}
      </div>

      <div class="details-box">
        <h4>Billed &amp; Shipped To</h4>
        <strong>${inv.buyer.fullName}</strong><br>
        ${inv.buyer.addressLine1}<br>
        ${inv.buyer.city}, ${inv.buyer.state} - ${inv.buyer.postalCode}<br>
        State Code: <strong>${inv.buyer.stateCode || '—'}</strong> | Country: ${inv.buyer.country}<br>
        Phone: ${inv.buyer.phone || '—'}
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">#</th>
          <th>Description of Goods</th>
          <th style="width: 80px; text-align: center;">HSN</th>
          <th style="width: 50px; text-align: center;">Qty</th>
          <th style="width: 100px; text-align: right;">Unit Price</th>
          <th style="width: 110px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div style="max-width: 400px; font-size: 12px; color: #555;">
        <p style="margin: 0 0 6px 0;">Amount in words:<br><strong style="font-size: 13px; color: #1a1714;">${inv.amountInWords}</strong></p>
        <p style="margin: 0 0 4px 0; color: #777;">Payment Method: <strong>${inv.payment.method?.toUpperCase()}</strong> (${inv.payment.status})</p>
        ${inv.payment.transactionId ? `<p style="margin: 0; color: #777;">Transaction Ref: <code>${inv.payment.transactionId}</code></p>` : ''}
      </div>

      <table class="totals-table">
        <tr>
          <td>Taxable Subtotal:</td>
          <td style="text-align: right; font-weight: 600;">₹${inv.taxBreakdown.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
        ${
          inv.discount > 0
            ? `
        <tr style="color: #16a34a;">
          <td>Discount:</td>
          <td style="text-align: right;">-₹${inv.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
        `
            : ''
        }
        <tr>
          <td>Shipping &amp; Handling:</td>
          <td style="text-align: right;">${inv.shippingFee > 0 ? `₹${inv.shippingFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '<span style="color: #16a34a;">FREE</span>'}</td>
        </tr>
        ${
          tax.isInterstate
            ? `
        <tr>
          <td>IGST (${tax.igstRate}%):</td>
          <td style="text-align: right;">₹${tax.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
        `
            : `
        <tr>
          <td>CGST (${tax.cgstRate}%):</td>
          <td style="text-align: right;">₹${tax.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td>SGST (${tax.sgstRate}%):</td>
          <td style="text-align: right;">₹${tax.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
        `
        }
        <tr class="grand-total">
          <td>Grand Total:</td>
          <td style="text-align: right;">₹${inv.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      </table>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; padding-top: 16px; border-top: 1px solid #eee;">
      <div style="font-size: 11px; color: #777;">
        <strong>Bank Wire Details:</strong><br>
        A/C: ${inv.seller.bankDetails?.accountName}<br>
        A/C No: ${inv.seller.bankDetails?.accountNumber}<br>
        IFSC: ${inv.seller.bankDetails?.ifsc} (${inv.seller.bankDetails?.bankName})
      </div>
      <div style="text-align: center; font-size: 11px; color: #444;">
        <div style="font-family: 'Cinzel', cursive; font-size: 16px; color: #8a6d3b; margin-bottom: 4px;">Lustre &amp; Co. Jewels</div>
        <div style="border-top: 1px solid #333; padding-top: 4px; width: 160px;">Authorized Signatory</div>
      </div>
    </div>

    <div class="legal-footer">
      This is a computer-generated tax invoice issued pursuant to Section 31 of the CGST Act 2017. All jewelry is crafted under strict hallmarking standards.
    </div>
  </div>
</body>
</html>`;
  }

  async getPackingSlipHtml(orderIdentifier: string): Promise<string> {
    const slip = await this.generatePackingSlip(orderIdentifier);

    const rows = slip.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: center; font-size: 13px;">${item.sNo}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; font-size: 13px;">
          <strong>${item.name}</strong><br>
          <small style="color: #666;">SKU: ${item.sku} | Color: ${item.color || 'Standard'} | Size: ${item.size || 'One Size'}</small>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: center; font-size: 14px; font-weight: 700;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: center; font-size: 16px; color: #888;">[  ]</td>
      </tr>
    `,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Packing Slip - ${slip.packingSlipNumber}</title>
  <style>
    @page { size: A4; margin: 14mm 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111; padding: 24px; margin: 0; }
    .slip-box { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; padding: 28px; }
    .btn-print { background: #1a1714; color: #fff; border: none; padding: 10px 20px; font-size: 14px; border-radius: 6px; cursor: pointer; font-weight: 600; }
    @media print { .no-print { display: none !important; } .slip-box { border: none; padding: 0; } }
  </style>
</head>
<body>
  <div style="text-align: right; max-width: 800px; margin: 0 auto 16px auto;" class="no-print">
    <button class="btn-print" onclick="window.print()">🖨️ Print Packing Slip</button>
  </div>

  <div class="slip-box">
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #1a1714; padding-bottom: 16px;">
      <div>
        <h1 style="margin: 0; font-size: 22px; letter-spacing: 1px;">${slip.sender.brandName}</h1>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #555;">Warehouse Dispatch Hub • Order Fulfillment</p>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 11px; font-weight: 700; background: #eee; padding: 3px 8px; border-radius: 4px;">PACKING SLIP</span>
        <h3 style="margin: 6px 0 2px 0; font-family: monospace; font-size: 16px;">${slip.packingSlipNumber}</h3>
        <span style="font-size: 12px; color: #666;">Order #${slip.orderNumber}</span>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; font-size: 13px;">
      <div style="background: #f9f9f9; padding: 12px; border-radius: 6px;">
        <strong style="color: #666; font-size: 11px; text-transform: uppercase;">Ship To:</strong><br>
        <strong>${slip.recipient.fullName}</strong><br>
        ${slip.recipient.addressLine1}<br>
        ${slip.recipient.city}, ${slip.recipient.state} - ${slip.recipient.postalCode}<br>
        Phone: ${slip.recipient.phone || '—'}
      </div>
      <div style="background: #f9f9f9; padding: 12px; border-radius: 6px;">
        <strong style="color: #666; font-size: 11px; text-transform: uppercase;">Logistics &amp; Dispatch:</strong><br>
        Courier: <strong>${slip.carrier}</strong><br>
        Tracking: <strong>${slip.trackingNumber || 'Pending Waybill'}</strong><br>
        Method: ${slip.shippingMethod}<br>
        Est. Weight: <strong>${slip.totalWeightGrams}g</strong>
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <thead>
        <tr style="background: #f3f3f3; font-size: 12px; text-transform: uppercase;">
          <th style="padding: 8px 10px; width: 40px; text-align: center;">#</th>
          <th style="padding: 8px 10px; text-align: left;">Item Description &amp; SKU</th>
          <th style="padding: 8px 10px; width: 60px; text-align: center;">Qty</th>
          <th style="padding: 8px 10px; width: 60px; text-align: center;">Check</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div style="background: #fff9e6; border: 1px dashed #d4af37; border-radius: 6px; padding: 12px; font-size: 12px; margin-bottom: 24px;">
      <strong>Fulfillment Instructions:</strong> ${slip.specialInstructions}
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 40px; font-size: 12px;">
      <div>Packed By: ___________________</div>
      <div>Quality Checked By: ___________________</div>
      <div>Date: _______________</div>
    </div>
  </div>
</body>
</html>`;
  }

  async getCreditNoteHtml(returnId: string): Promise<string> {
    const cn = await this.generateCreditNote(returnId);

    const rows = cn.items
      .map(
        (i) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${i.sNo}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${i.name} (${[i.color, i.size].filter(Boolean).join(' / ')})</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${i.hsnCode}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${i.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">₹${i.unitPrice.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: 600;">₹${i.totalAmount.toFixed(2)}</td>
      </tr>
    `,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GST Credit Note - ${cn.creditNoteNumber}</title>
  <style>
    @page { size: A4; margin: 14mm 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #1a1714; padding: 24px; margin: 0; }
    .cn-card { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; padding: 28px; }
    .btn-print { background: #1a1714; color: #fff; border: none; padding: 10px 20px; font-size: 14px; border-radius: 6px; cursor: pointer; font-weight: 600; }
    @media print { .no-print { display: none !important; } .cn-card { border: none; padding: 0; } }
  </style>
</head>
<body>
  <div style="text-align: right; max-width: 800px; margin: 0 auto 16px auto;" class="no-print">
    <button class="btn-print" onclick="window.print()">🖨️ Print Credit Note</button>
  </div>

  <div class="cn-card">
    <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #8a6d3b; padding-bottom: 14px; margin-bottom: 20px;">
      <div>
        <h2 style="margin: 0; font-size: 22px;">${cn.seller.brandName}</h2>
        <span style="font-size: 12px; color: #666;">GSTIN: ${cn.seller.gstin} | PAN: ${cn.seller.pan}</span>
      </div>
      <div style="text-align: right;">
        <span style="background: #fee2e2; color: #991b1b; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">CREDIT NOTE</span>
        <h3 style="margin: 6px 0 2px 0; font-family: monospace;">${cn.creditNoteNumber}</h3>
        <span style="font-size: 12px; color: #666;">Ref Invoice: <strong>${cn.originalInvoiceNumber}</strong></span>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; font-size: 13px;">
      <div style="background: #fbfbfb; padding: 12px; border-radius: 6px;">
        <strong>Customer:</strong><br>
        ${cn.buyer.fullName}<br>
        ${cn.buyer.addressLine1}, ${cn.buyer.city}, ${cn.buyer.state} - ${cn.buyer.postalCode}
      </div>
      <div style="background: #fbfbfb; padding: 12px; border-radius: 6px;">
        <strong>Return Reference:</strong><br>
        Return ID: <strong>${cn.returnNumber}</strong><br>
        Reason: <strong>${cn.reason}</strong><br>
        Refund Channel: <strong>${cn.refundMethod}</strong>
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
      <thead>
        <tr style="background: #f1f1f1;">
          <th style="padding: 8px; text-align: center;">#</th>
          <th style="padding: 8px; text-align: left;">Returned Item</th>
          <th style="padding: 8px; text-align: center;">HSN</th>
          <th style="padding: 8px; text-align: center;">Qty</th>
          <th style="padding: 8px; text-align: right;">Rate</th>
          <th style="padding: 8px; text-align: right;">Credit Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
      <div style="font-size: 12px; max-width: 400px;">
        Amount in words:<br>
        <strong>${cn.amountInWords}</strong>
      </div>
      <div style="text-align: right; font-size: 15px;">
        <span style="color: #666;">Total Credit Adjusted:</span><br>
        <strong style="font-size: 20px; color: #8a6d3b;">₹${cn.refundAmount.toFixed(2)}</strong>
      </div>
    </div>

    <div style="border-top: 1px dashed #ccc; padding-top: 12px; font-size: 11px; color: #666; text-align: center;">
      This Credit Note is issued in accordance with Section 34 of the CGST Act, 2017 against return of goods.
    </div>
  </div>
</body>
</html>`;
  }

  async getRefundReceiptHtml(returnId: string): Promise<string> {
    const ref = await this.generateRefundReceipt(returnId);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Refund Receipt - ${ref.receiptNumber}</title>
  <style>
    @page { size: A4; margin: 14mm 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #1a1714; padding: 24px; margin: 0; }
    .ref-box { max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .btn-print { background: #1a1714; color: #fff; border: none; padding: 10px 20px; font-size: 14px; border-radius: 6px; cursor: pointer; font-weight: 600; }
    @media print { .no-print { display: none !important; } .ref-box { border: none; box-shadow: none; padding: 0; } }
  </style>
</head>
<body>
  <div style="text-align: right; max-width: 600px; margin: 0 auto 16px auto;" class="no-print">
    <button class="btn-print" onclick="window.print()">🖨️ Print Receipt</button>
  </div>

  <div class="ref-box">
    <div style="text-align: center; border-bottom: 2px solid #8a6d3b; padding-bottom: 16px; margin-bottom: 20px;">
      <h2 style="margin: 0; font-size: 22px; letter-spacing: 1px;">${ref.company.brandName}</h2>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">OFFICIAL REFUND ACKNOWLEDGMENT RECEIPT</p>
    </div>

    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 14px; text-align: center; margin-bottom: 20px;">
      <span style="font-size: 12px; color: #166534; font-weight: 700; text-transform: uppercase;">Refund Settled</span>
      <h1 style="margin: 4px 0 0 0; font-size: 28px; color: #15803d;">₹${ref.refundAmount.toFixed(2)}</h1>
    </div>

    <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 8px 0; color: #666;">Receipt Number:</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 700; font-family: monospace;">${ref.receiptNumber}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;">Date &amp; Time:</td>
        <td style="padding: 8px 0; text-align: right;">${new Date(ref.receiptDate).toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;">Customer Name:</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 600;">${ref.customerName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;">Order Number:</td>
        <td style="padding: 8px 0; text-align: right; font-family: monospace;">${ref.orderNumber}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;">Return Case ID:</td>
        <td style="padding: 8px 0; text-align: right; font-family: monospace;">${ref.returnNumber}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;">Payment Refund Method:</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 600;">${ref.refundMethod}</td>
      </tr>
      ${
        ref.transactionId
          ? `
      <tr>
        <td style="padding: 8px 0; color: #666;">Bank / Gateway Reference:</td>
        <td style="padding: 8px 0; text-align: right; font-family: monospace;">${ref.transactionId}</td>
      </tr>`
          : ''
      }
    </table>

    <div style="background: #faf8f5; border-radius: 6px; padding: 12px; font-size: 12px; margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span>Item Refund Value:</span>
        <strong>₹${ref.breakdown.itemTotalRefund.toFixed(2)}</strong>
      </div>
      ${
        ref.breakdown.restockingFeeDeduction > 0
          ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #dc2626;">
        <span>Restocking Deductions:</span>
        <span>-₹${ref.breakdown.restockingFeeDeduction.toFixed(2)}</span>
      </div>`
          : ''
      }
      ${
        ref.breakdown.bonusStoreCredit && ref.breakdown.bonusStoreCredit > 0
          ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #16a34a;">
        <span>Store Credit Loyalty Bonus:</span>
        <span>+₹${ref.breakdown.bonusStoreCredit.toFixed(2)}</span>
      </div>`
          : ''
      }
      <div style="display: flex; justify-content: space-between; border-top: 1px solid #ddd; padding-top: 6px; font-size: 13px; font-weight: 700;">
        <span>Net Amount Credited:</span>
        <span style="color: #15803d;">₹${ref.breakdown.netRefunded.toFixed(2)}</span>
      </div>
    </div>

    <div style="text-align: center; font-size: 11px; color: #777;">
      If you have questions regarding this refund receipt, please contact ${ref.company.supportEmail}.
    </div>
  </div>
</body>
</html>`;
  }

  private formatDocumentAddress(addr: any, cust: any): DocumentAddress {
    const raw = addr || {};
    const state = raw.state || 'Maharashtra';
    return {
      fullName: cust?.fullName || cust?.name || 'Valued Customer',
      email: cust?.email,
      phone: cust?.phone,
      addressLine1: raw.address || raw.addressLine1 || '',
      addressLine2: raw.addressLine2 || '',
      city: raw.city || '',
      state,
      stateCode: this.getStateCode(state),
      postalCode: (raw.postalCode || '').toString(),
      country: raw.country || 'India',
    };
  }

  async generateShippingLabel(orderIdentifier: string): Promise<ShippingLabelDocument> {
    const order = await this.getOrder(orderIdentifier);
    const seller = await this.getCompanyLegalDetails();
    const recipient = this.formatDocumentAddress(order.shippingAddress, order.customer);
    const rawItems: any[] = order.items || [];
    const items = rawItems.map((item, idx) => ({
      sNo: idx + 1,
      productId: item.productId || item.product || String(idx),
      name: item.name || 'Jewelry Piece',
      color: item.color,
      size: item.size,
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.price || 0),
      totalAmount: Number(item.price || 0) * Number(item.quantity || 1),
    }));
    const totalWeightKg = items.reduce((sum: number, it: any) => sum + (it.quantity * 0.25), 0.25);
    const tracking = order.tracking_number || order.trackingNumber || `AWB-${(order.orderId || order.id).slice(0, 10).toUpperCase()}`;

    return {
      labelNumber: `LBL-${(order.orderId || order.id).slice(0, 10).toUpperCase()}`,
      generatedAt: new Date().toISOString(),
      orderId: order.id,
      orderNumber: order.orderId || order.id,
      orderDate: order.createdAt || new Date().toISOString(),
      carrier: order.carrier || order.shipping_provider || 'Lustre & Co. Express Logistics',
      trackingNumber: tracking,
      awbNumber: order.awb_number || tracking,
      routingBarcode: `*${tracking.replace(/[^A-Z0-9]/gi, '')}*`,
      shipmentType: 'Express Insured Jewelry Delivery',
      paymentMode: (order.payment?.method === 'cod' || order.paymentMethod === 'cod') ? 'COD' : 'PREPAID',
      codAmount: (order.payment?.method === 'cod' || order.paymentMethod === 'cod') ? Number(order.total || 0) : 0,
      sender: seller,
      recipient,
      packageDetails: {
        weightKg: Number(totalWeightKg.toFixed(2)),
        dimensions: '20 x 15 x 8 cm',
        itemCount: items.reduce((sum: number, it: any) => sum + it.quantity, 0),
      },
      returnAddress: {
        fullName: seller.companyName,
        addressLine1: seller.registeredAddress,
        city: seller.city,
        state: seller.state,
        postalCode: seller.postalCode,
        country: seller.country,
        phone: seller.supportPhone,
      },
    };
  }

  async getShippingLabelHtml(orderIdentifier: string): Promise<string> {
    const label = await this.generateShippingLabel(orderIdentifier);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Shipping Label - ${label.orderNumber}</title>
  <style>
    @page { size: 4in 6in; margin: 0; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 16px;
      color: #000;
      background: #fff;
      font-size: 12px;
      line-height: 1.3;
    }
    .label-box {
      border: 3px solid #000;
      padding: 14px;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
    }
    .brand { font-size: 18px; font-weight: 900; letter-spacing: 1px; }
    .mode-badge {
      font-size: 16px;
      font-weight: 900;
      padding: 4px 10px;
      border: 2px solid #000;
      background: ${label.paymentMode === 'COD' ? '#000' : '#fff'};
      color: ${label.paymentMode === 'COD' ? '#fff' : '#000'};
    }
    .barcode-section {
      text-align: center;
      padding: 12px 0;
      border-bottom: 2px dashed #000;
    }
    .barcode-visual {
      font-family: 'Courier New', Courier, monospace;
      font-size: 26px;
      letter-spacing: 5px;
      font-weight: bold;
    }
    .tracking-text {
      font-size: 14px;
      font-weight: 700;
      margin-top: 4px;
    }
    .address-section {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 2px solid #000;
    }
    .address-box strong { font-size: 13px; display: block; margin-bottom: 2px; }
    .pkg-info {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      padding: 8px 0;
      border-bottom: 1px solid #000;
    }
    .footer-note {
      font-size: 9px;
      text-align: center;
      color: #333;
      margin-top: 6px;
    }
  </style>
</head>
<body onload="window.print()">
  <div class="label-box">
    <div class="header-row">
      <div>
        <div class="brand">LUSTRE &amp; CO.</div>
        <small style="font-weight: 600;">${label.carrier.toUpperCase()}</small>
      </div>
      <div class="mode-badge">${label.paymentMode}${label.paymentMode === 'COD' ? ` (₹${label.codAmount.toFixed(0)})` : ''}</div>
    </div>

    <div class="barcode-section">
      <div class="barcode-visual">||| | |||| || ||| |||| |</div>
      <div class="tracking-text">AWB / TRACKING: ${label.trackingNumber}</div>
      <div style="font-size: 10px; color: #555;">Order Ref: ${label.orderNumber}</div>
    </div>

    <div class="address-section">
      <div class="address-box">
        <span style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: #555;">Deliver To:</span>
        <strong>${label.recipient.fullName}</strong>
        <div>${label.recipient.addressLine1}</div>
        ${label.recipient.addressLine2 ? `<div>${label.recipient.addressLine2}</div>` : ''}
        <div style="font-size: 13px; font-weight: 800; margin-top: 2px;">
          ${label.recipient.city}, ${label.recipient.state} - ${label.recipient.postalCode}
        </div>
        ${label.recipient.phone ? `<div>Phone: <strong>${label.recipient.phone}</strong></div>` : ''}
      </div>

      <div class="address-box" style="border-top: 1px dashed #999; padding-top: 6px; font-size: 10px;">
        <span style="font-weight: 700;">From / Return Address:</span>
        <div>${label.sender.companyName}</div>
        <div>${label.sender.registeredAddress}, ${label.sender.city} ${label.sender.postalCode}</div>
        <div>Helpline: ${label.sender.supportPhone}</div>
      </div>
    </div>

    <div class="pkg-info">
      <div><strong>Pieces:</strong> ${label.packageDetails.itemCount}</div>
      <div><strong>Weight:</strong> ${label.packageDetails.weightKg} kg</div>
      <div><strong>Dims:</strong> ${label.packageDetails.dimensions}</div>
    </div>

    <div class="footer-note">
      * High Value Tamper-Evident Package • Insured Precious Goods *
    </div>
  </div>
</body>
</html>`;
  }

  async generateOrderSummary(orderIdentifier: string): Promise<OrderSummaryDocument> {
    const order = await this.getOrder(orderIdentifier);
    const company = await this.getCompanyLegalDetails();
    const shippingAddress = this.formatDocumentAddress(order.shippingAddress, order.customer);
    const billingAddress = this.formatDocumentAddress(order.billingAddress || order.shippingAddress, order.customer);
    const rawItems: any[] = order.items || [];
    const items = rawItems.map((item, idx) => ({
      sNo: idx + 1,
      productId: item.productId || item.product || String(idx),
      name: item.name || 'Jewelry Piece',
      color: item.color,
      size: item.size,
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.price || 0),
      totalAmount: Number(item.price || 0) * Number(item.quantity || 1),
    }));
    const taxBreakdown = this.calculateTaxBreakdown(
      Number(order.subtotal || 0),
      shippingAddress.state,
    );

    return {
      summaryNumber: `SUM-${(order.orderId || order.id).slice(0, 10).toUpperCase()}`,
      orderId: order.id,
      orderNumber: order.orderId || order.id,
      orderDate: order.createdAt || new Date().toISOString(),
      generatedAt: new Date().toISOString(),
      customer: {
        fullName: order.customer?.fullName || order.customer?.name || shippingAddress.fullName,
        email: order.customer?.email || shippingAddress.email || '',
        phone: order.customer?.phone || shippingAddress.phone || '',
      },
      shippingAddress,
      billingAddress,
      items,
      subtotal: Number(order.subtotal || 0),
      discount: Number(order.discount || 0),
      promoCode: order.promoCode,
      shippingFee: Number(order.shippingFee || order.shipping_cost || 0),
      taxBreakdown,
      grandTotal: Number(order.total || 0),
      amountInWords: numberToWords(Number(order.total || 0)),
      payment: {
        method: order.payment?.method || order.paymentMethod || 'Prepaid',
        status: order.payment?.status || 'Confirmed',
        transactionId: order.payment?.transactionId,
      },
      shipping: {
        carrier: order.carrier || order.shipping_provider || 'Standard Carrier',
        trackingNumber: order.tracking_number || order.trackingNumber,
        status: order.shipping_status || 'Pending',
        estimatedDelivery: order.estimatedDeliveryDate,
      },
      company,
    };
  }

  async getOrderSummaryHtml(orderIdentifier: string): Promise<string> {
    const sum = await this.generateOrderSummary(orderIdentifier);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Order Summary - ${sum.orderNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.5; font-size: 13px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
    .brand { font-size: 20px; font-weight: 800; color: #b8860b; letter-spacing: 1px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f8fafc; border-bottom: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 12px; }
    td { border-bottom: 1px solid #e2e8f0; padding: 8px; }
    .totals { width: 300px; margin-left: auto; }
    .totals-row { display: flex; justify-content: space-between; padding: 4px 0; }
    .total-grand { font-size: 15px; font-weight: 800; border-top: 2px solid #1e293b; padding-top: 6px; }
  </style>
</head>
<body onload="window.print()">
  <div class="header">
    <div>
      <div class="brand">LUSTRE &amp; CO.</div>
      <div style="font-size: 12px; color: #64748b;">Official Store Order Summary</div>
    </div>
    <div style="text-align: right;">
      <div style="font-weight: 700; font-size: 16px;">${sum.orderNumber}</div>
      <div style="color: #64748b;">${new Date(sum.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
    </div>
  </div>

  <div class="grid">
    <div>
      <strong style="color: #64748b; font-size: 11px; text-transform: uppercase;">Customer &amp; Shipping</strong>
      <div style="font-weight: 700; margin-top: 4px;">${sum.customer.fullName}</div>
      <div>${sum.shippingAddress.addressLine1}</div>
      <div>${sum.shippingAddress.city}, ${sum.shippingAddress.state} - ${sum.shippingAddress.postalCode}</div>
      <div>Phone: ${sum.customer.phone}</div>
      <div>Email: ${sum.customer.email}</div>
    </div>
    <div>
      <strong style="color: #64748b; font-size: 11px; text-transform: uppercase;">Payment &amp; Logistics</strong>
      <div style="margin-top: 4px;"><strong>Payment Method:</strong> ${sum.payment.method.toUpperCase()} (${sum.payment.status})</div>
      <div><strong>Carrier:</strong> ${sum.shipping.carrier}</div>
      ${sum.shipping.trackingNumber ? `<div><strong>Tracking Number:</strong> ${sum.shipping.trackingNumber}</div>` : ''}
      <div><strong>Shipping Status:</strong> ${sum.shipping.status}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Item</th>
        <th>Qty</th>
        <th style="text-align: right;">Price</th>
        <th style="text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${sum.items.map((it) => `
        <tr>
          <td>${it.sNo}</td>
          <td>
            <strong>${it.name}</strong>
            ${it.color || it.size ? `<br><small style="color: #64748b;">${[it.color, it.size].filter(Boolean).join(' • ')}</small>` : ''}
          </td>
          <td>${it.quantity}</td>
          <td style="text-align: right;">₹${it.unitPrice.toFixed(2)}</td>
          <td style="text-align: right;">₹${it.totalAmount.toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row"><span>Subtotal:</span><strong>₹${sum.subtotal.toFixed(2)}</strong></div>
    ${sum.discount > 0 ? `<div class="totals-row" style="color: #dc2626;"><span>Discount:</span><strong>-₹${sum.discount.toFixed(2)}</strong></div>` : ''}
    <div class="totals-row"><span>Shipping:</span><strong>${sum.shippingFee === 0 ? 'FREE' : `₹${sum.shippingFee.toFixed(2)}`}</strong></div>
    <div class="totals-row"><span>Taxes (${sum.taxBreakdown.cgstRate + sum.taxBreakdown.sgstRate + sum.taxBreakdown.igstRate}% GST):</span><strong>₹${sum.taxBreakdown.totalTax.toFixed(2)}</strong></div>
    <div class="totals-row total-grand"><span>Total Amount:</span><span style="color: #b8860b;">₹${sum.grandTotal.toFixed(2)}</span></div>
  </div>

  <div style="margin-top: 30px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px;">
    ${sum.company.companyName} • GSTIN: ${sum.company.gstin} • Support: ${sum.company.supportEmail}
  </div>
</body>
</html>`;
  }
}

