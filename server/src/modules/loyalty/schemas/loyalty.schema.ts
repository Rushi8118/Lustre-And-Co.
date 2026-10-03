// server/src/modules/loyalty/schemas/loyalty.schema.ts

export type LoyaltyTransactionType =
  | 'purchase'
  | 'review'
  | 'referral_inviter'
  | 'referral_friend'
  | 'birthday'
  | 'admin_adjustment'
  | 'redemption'
  | 'expiration'
  | 'refund_reversal';

export type ReferralStatus =
  | 'clicked'
  | 'registered'
  | 'qualified'
  | 'rewarded'
  | 'rejected';

export interface LoyaltySettings {
  enabled: boolean;
  pointsPerCurrency: number;
  currencyUnit: number;
  reviewPoints: number;
  referralInviterPoints: number;
  referralFriendPoints: number;
  birthdayPoints: number;
  minimumReferralOrderAmount: number;
  pointsExpireDays?: number | null;
  birthdayRewardEnabled: boolean;
  reviewRewardEnabled: boolean;
  referralRewardEnabled: boolean;
}

export interface LoyaltyTier {
  id: string;
  name: string;
  minLifetimePoints: number;
  minLifetimeSpend: number;
  pointsMultiplier: number;
  birthdayMultiplier: number;
  benefits: string[];
  sortOrder: number;
  isActive: boolean;
}

export interface LoyaltyAccount {
  id: string;
  userId: string;
  availablePoints: number;
  lifetimePoints: number;
  redeemedPoints: number;
  walletBalance: number;
  lifetimeSpend: number;
  referralCode: string;
  referredByUserId?: string | null;
  referralCompletedAt?: string | null;
  birthdayMonth?: number | null;
  birthdayDay?: number | null;
  birthdayYear?: number | null;
  currentTier?: LoyaltyTier | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoyaltyLedgerEntry {
  id: string;
  userId: string;
  transactionType: LoyaltyTransactionType;
  points: number;
  walletAmount: number;
  orderId?: string | null;
  referredUserId?: string | null;
  idempotencyKey: string;
  description?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

export const DEFAULT_LOYALTY_SETTINGS: LoyaltySettings = {
  enabled: true,
  pointsPerCurrency: 1,
  currencyUnit: 1,
  reviewPoints: 50,
  referralInviterPoints: 500,
  referralFriendPoints: 250,
  birthdayPoints: 200,
  minimumReferralOrderAmount: 500,
  pointsExpireDays: null,
  birthdayRewardEnabled: true,
  reviewRewardEnabled: true,
  referralRewardEnabled: true,
};
