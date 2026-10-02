import type { Doc } from '../../../common/utils/db.js';

export interface Payment {
  /** Id of the order row. */
  order: string;
  orderId: string;
  user?: string | null;
  amount: number;
  currency: string;
  method: 'card' | 'wallet' | 'cod' | 'netbanking' | 'razorpay' | string;
  status: 'pending' | 'paid' | 'failed' | 'refunded' | string;
  transactionId?: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  razorpaySignature?: string | null;
  paidAt?: string | null;
}

export type PaymentDocument = Doc<Payment>;
