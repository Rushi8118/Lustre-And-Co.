import type { Doc } from '../../../common/utils/db.js';

export interface CartItem {
  id: string; // compositeId, e.g. 'aurora-gold-plated-necklace-gold-standard'
  /** Product id. */
  product: string;
  quantity: number;
  selectedColor: string;
  selectedSize: string;
}

export interface Cart {
  user: string;
  items: CartItem[];
}

export type CartDocument = Doc<Cart>;
