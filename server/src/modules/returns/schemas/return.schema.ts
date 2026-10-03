export type ReturnRequestType = 'return' | 'exchange';

export type ReturnStatus =
  | 'Requested'
  | 'Approved'
  | 'Pickup scheduled'
  | 'Received'
  | 'Inspected'
  | 'Refund initiated'
  | 'Completed'
  | 'Rejected'
  | 'Cancelled';

export type RefundPreference = 'original_payment' | 'store_credit';

export type InspectionStatus = 'Pending' | 'Passed' | 'Failed' | 'Partially Approved';

export type RefundStatus = 'Pending' | 'Approved' | 'Initiated' | 'Completed' | 'Failed';

export interface ReturnItem {
  productId: string;
  name: string;
  color?: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  reason?: string;
  exchangeColor?: string;
  exchangeSize?: string;
  photos?: string[];
}

export interface ReturnPickupAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ReturnStatusHistoryEntry {
  status: ReturnStatus;
  note?: string;
  at: string;
  by?: string;
}

export interface OrderReturn {
  id: string;
  returnNumber: string; // e.g. RET-2026-0001 or EXC-2026-0001
  orderId: string;
  orderNumber: string;
  userId?: string | null;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  requestType: ReturnRequestType;
  status: ReturnStatus;
  reason: string;
  customerNotes?: string;
  items: ReturnItem[];
  photos: string[];
  refundPreference: RefundPreference;
  storeCreditBonusPercent: number;
  totalItemsCount: number;
  calculatedRefundAmount: number;
  actualRefundAmount: number;
  restockingFee: number;
  pickupAddress: ReturnPickupAddress;
  pickupCourier?: string | null;
  pickupTrackingNumber?: string | null;
  pickupScheduledDate?: string | null;
  adminNotes?: string | null;
  rejectionReason?: string | null;
  inspectionStatus: InspectionStatus;
  inspectionNotes?: string | null;
  refundStatus: RefundStatus;
  refundMethod?: string | null;
  refundTransactionId?: string | null;
  exchangeItemDetails?: Record<string, unknown>;
  exchangeOrderId?: string | null;
  exchangeOrderNumber?: string | null;
  creditNoteId?: string | null;
  creditNoteNumber?: string | null;
  statusHistory: ReturnStatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
}
