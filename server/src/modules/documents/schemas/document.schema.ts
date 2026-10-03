export type InvoiceType = 'tax_invoice' | 'credit_note' | 'proforma' | 'receipt';

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'cancelled' | 'refunded';

export interface CompanyLegalDetails {
  companyName: string;
  brandName: string;
  cin: string; // Corporate Identity Number
  gstin: string; // Goods and Services Tax Identification Number
  pan: string; // Permanent Account Number
  registeredAddress: string;
  city: string;
  state: string;
  stateCode: string; // e.g. "27" for Maharashtra
  postalCode: string;
  country: string;
  supportEmail: string;
  supportPhone: string;
  website: string;
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    ifsc: string;
    branch: string;
  };
}

export interface DocumentAddress {
  fullName: string;
  email?: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  stateCode?: string;
  postalCode: string;
  country: string;
  gstin?: string;
}

export interface DocumentItem {
  sNo: number;
  productId: string;
  name: string;
  color?: string;
  size?: string;
  hsnCode: string; // e.g. "7117.90"
  quantity: number;
  unitPrice: number;
  discount: number;
  taxableValue: number;
  gstRate: number; // e.g. 3 (%)
  cgstRate?: number; // 1.5 (%)
  cgstAmount?: number;
  sgstRate?: number; // 1.5 (%)
  sgstAmount?: number;
  igstRate?: number; // 3.0 (%)
  igstAmount?: number;
  totalAmount: number;
}

export interface TaxBreakdown {
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  isInterstate: boolean;
}

export interface InvoiceDocument {
  id: string;
  invoiceNumber: string; // e.g. INV-2026-0001
  invoiceDate: string;
  invoiceType: InvoiceType;
  orderId: string;
  orderNumber: string;
  orderDate: string;
  seller: CompanyLegalDetails;
  buyer: DocumentAddress;
  shippingAddress: DocumentAddress;
  billingAddress: DocumentAddress;
  items: DocumentItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  taxBreakdown: TaxBreakdown;
  grandTotal: number;
  amountInWords: string;
  payment: {
    method: string;
    status: string;
    transactionId?: string;
    paidAt?: string;
  };
  status: InvoiceStatus;
  notes?: string;
}

export interface CreditNoteDocument {
  id: string;
  creditNoteNumber: string; // e.g. CN-2026-0001
  creditNoteDate: string;
  originalInvoiceNumber: string;
  originalInvoiceDate?: string;
  returnNumber: string;
  orderId: string;
  orderNumber: string;
  seller: CompanyLegalDetails;
  buyer: DocumentAddress;
  items: DocumentItem[];
  reason: string;
  refundAmount: number;
  taxAdjustment: TaxBreakdown;
  amountInWords: string;
  refundMethod: string;
}

export interface PackingSlipDocument {
  packingSlipNumber: string; // e.g. PACK-2026-0001
  generatedAt: string;
  orderId: string;
  orderNumber: string;
  orderDate: string;
  carrier: string;
  trackingNumber?: string;
  shippingMethod: string;
  sender: CompanyLegalDetails;
  recipient: DocumentAddress;
  items: Array<{
    sNo: number;
    name: string;
    sku?: string;
    color?: string;
    size?: string;
    quantity: number;
    weightGrams?: number;
  }>;
  totalItems: number;
  totalWeightGrams: number;
  specialInstructions?: string;
}

export interface RefundReceiptDocument {
  receiptNumber: string; // e.g. REF-2026-0001
  receiptDate: string;
  returnNumber: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  refundAmount: number;
  refundMethod: string;
  transactionId?: string;
  refundStatus: string;
  breakdown: {
    itemTotalRefund: number;
    restockingFeeDeduction: number;
    bonusStoreCredit?: number;
    netRefunded: number;
  };
  company: CompanyLegalDetails;
}

export interface ShippingLabelDocument {
  labelNumber: string;
  generatedAt: string;
  orderId: string;
  orderNumber: string;
  orderDate: string;
  carrier: string;
  trackingNumber: string;
  awbNumber?: string;
  routingBarcode: string;
  shipmentType: string;
  paymentMode: 'PREPAID' | 'COD';
  codAmount: number;
  sender: CompanyLegalDetails;
  recipient: DocumentAddress;
  packageDetails: {
    weightKg: number;
    dimensions: string;
    itemCount: number;
  };
  returnAddress: DocumentAddress;
}

export interface OrderSummaryDocument {
  summaryNumber: string;
  orderId: string;
  orderNumber: string;
  orderDate: string;
  generatedAt: string;
  customer: {
    fullName: string;
    email: string;
    phone: string;
  };
  shippingAddress: DocumentAddress;
  billingAddress: DocumentAddress;
  items: Array<{
    sNo: number;
    productId: string;
    name: string;
    color?: string;
    size?: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
  }>;
  subtotal: number;
  discount: number;
  promoCode?: string;
  shippingFee: number;
  taxBreakdown: TaxBreakdown;
  grandTotal: number;
  amountInWords: string;
  payment: {
    method: string;
    status: string;
    transactionId?: string;
  };
  shipping: {
    carrier: string;
    trackingNumber?: string;
    status: string;
    estimatedDelivery?: string;
  };
  company: CompanyLegalDetails;
}

