import type { Doc } from '../../../common/utils/db.js';

export const ORDER_STATUSES = ['Confirmed', 'Processing', 'In Transit', 'Delivered', 'Cancelled'];

export interface OrderPayment {
  method: string;
  status: string;
  transactionId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  paidAt?: string;
}

export interface Order {
  orderId: string; // e.g. 'LST-89421056'
  user?: string | null;
  customer: { fullName: string; email: string; phone: string };
  shippingAddress: { address: string; city: string; state: string; postalCode: string; country: string };
  items: Array<{
    productId: string;
    slug?: string;
    name: string;
    price: number;
    quantity: number;
    color: string;
    size: string;
    image: string;
  }>;
  subtotal: number;
  discount: number;
  promoCode?: string | null;
  shippingFee: number;
  deliverySurcharge: number;
  tax: number;
  total: number;
  deliveryOption: 'standard' | 'express' | string;
  notes: string;
  status: string;
  statusHistory: Array<{ status: string; note?: string; at: string }>;
  payment: OrderPayment;
  carrier: string;
  trackingNumber?: string | null;
  tracking_number?: string | null;
  awb_number?: string | null;
  tracking_url?: string | null;
  shipping_label_url?: string | null;
  selected_shipping_method_id?: string | null;
  shipping_provider?: string | null;
  shipping_provider_code?: string | null;
  shipping_shipment_id?: string | null;
  shipping_quote_token?: string | null;
  shipping_cost?: number;
  shipping_status?: string | null;
  estimatedDeliveryDate: string;
  /** Set once stock has been returned to inventory for a cancelled order. */
  stockRestored: boolean;
}

export type OrderDocument = Doc<Order>;
