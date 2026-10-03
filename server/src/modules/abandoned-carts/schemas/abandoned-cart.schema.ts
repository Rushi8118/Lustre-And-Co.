export type AbandonedCartStatus =
  | 'abandoned'
  | 'recovery_sent'
  | 'recovered';

export interface AbandonedCartItemDetail {
  id: string;
  productId: string;
  name: string;
  slug?: string;
  price: number;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  image?: string | null;
  subtotal: number;
}

export interface AbandonedCart {
  id: string;
  cartId: string;
  user?: string | null;
  customer?: {
    id?: string;
    name: string;
    email: string;
    phone?: string | null;
  };
  items: AbandonedCartItemDetail[];
  itemCount: number;
  subtotal: number;
  status: AbandonedCartStatus;
  abandonedAt: string;
  firstReminderSentAt?: string | null;
  secondReminderSentAt?: string | null;
  recoveryEmailCount: number;
  recoveredAt?: string | null;
  recoveredOrderId?: string | null;
  hoursAgo: number;
}

export interface AbandonedCartSettings {
  enabled: boolean;
  abandonmentThresholdMinutes: number;
  autoRecoveryEmail: boolean;
  firstReminderDelayHours: number;
  secondReminderDelayHours: number;
  couponPercentage: number;
  couponCode: string;
  firstReminderSubject: string;
  firstReminderHeadline: string;
  firstReminderBody: string;
  secondReminderSubject: string;
  secondReminderHeadline: string;
  secondReminderBody: string;
  senderEmail: string;
}

export const DEFAULT_ABANDONED_CART_SETTINGS: AbandonedCartSettings = {
  enabled: true,
  abandonmentThresholdMinutes: 60,
  autoRecoveryEmail: true,
  firstReminderDelayHours: 2,
  secondReminderDelayHours: 48,
  couponPercentage: 10,
  couponCode: 'LUSTRE10',
  firstReminderSubject: 'You left something radiant in your bag',
  firstReminderHeadline: 'Your jewelry pieces are waiting for you',
  firstReminderBody:
    'We noticed that you left some beautiful pieces in your bag. They are still waiting for you.',
  secondReminderSubject: 'A final reminder from Lustre & Co.',
  secondReminderHeadline: 'Your bag will not stay reserved forever',
  secondReminderBody:
    'This is a final reminder about the pieces you selected. Complete your order before they are gone.',
  senderEmail: '',
};
