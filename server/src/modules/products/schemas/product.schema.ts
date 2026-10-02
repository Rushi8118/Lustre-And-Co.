import type { Doc } from '../../../common/utils/db.js';

export interface Product {
  slug: string;
  name: string;
  sku?: string | null;
  /** Slug of a row in the categories table. */
  category: string;
  collectionName: string;
  occasion: string; // 'everyday' | 'bridal' | 'party' | 'festive'
  price: number;
  oldPrice?: number | null;
  /** Average of approved reviews; recalculated whenever reviews are moderated. */
  rating: number;
  /** Count of approved reviews. */
  reviews: number;
  badge?: string | null;
  finish: string;
  material: string;
  availableColors: string[];
  availableSizes: string[];
  availability: string;
  stockQuantity: number;
  /** Units sold across non-cancelled orders. */
  salesCount: number;
  image: string;
  gallery: string[];
  description?: string | null;
  details: string[];
  care: string[];
  shipping: string[];
  returns: string[];
  tags: string[]; // 'new' and 'bestseller' drive the New Arrivals / Best Sellers pages
  /** Hidden products are excluded from the storefront but stay visible to admins. */
  isActive: boolean;
  isFeatured: boolean;
}

export type ProductDocument = Doc<Product>;
