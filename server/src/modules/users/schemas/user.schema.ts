import type { Doc } from '../../../common/utils/db.js';

export interface Address {
  _id: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface User {
  name: string;
  email: string;
  googleId?: string | null;
  provider: string;
  password: string;
  role: 'customer' | 'admin' | string;
  phone?: string | null;
  addresses: Address[];
  /** Product ids. */
  wishlist: string[];
  /** Deactivated accounts cannot sign in or use existing tokens. */
  isActive: boolean;
  lastLoginAt?: string | null;
  /** SHA-256 hash of the single-use reset token; the raw token is never stored. */
  resetPasswordTokenHash?: string | null;
  resetPasswordExpires?: string | null;
}

export type UserDocument = Doc<User>;

/** Every column except password and reset-token fields. */
export const USER_PUBLIC_COLUMNS =
  'id, name, email, googleId, provider, role, phone, addresses, wishlist, isActive, lastLoginAt, createdAt, updatedAt';
