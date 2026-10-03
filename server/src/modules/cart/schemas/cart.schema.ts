import type { Doc } from '../../../common/utils/db.js';

export interface CartItem {
  id?: string;
  product: string;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  price?: number;
  unitPrice?: number;
  name?: string;
  image?: string;
}

export interface Cart {
  id?: string;
  user?: string | null;
  items: CartItem[];
  bundle_items?: any[];
  recoveryEmail?: string | null;
  customerName?: string | null;
  phone?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type CartDocument = Doc<Cart>;
