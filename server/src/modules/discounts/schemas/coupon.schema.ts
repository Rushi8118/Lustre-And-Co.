import type { Doc } from '../../../common/utils/db.js';

export interface Coupon {
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping' | string;
  /** 0.10 for 10% (percentage), rupee amount (fixed), ignored for free_shipping. */
  value: number;
  description: string;
  minOrderAmount: number;
  /** Maximum redemptions across all customers; 0 means unlimited. */
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  expiresAt?: string | null;
}

export type CouponDocument = Doc<Coupon>;
