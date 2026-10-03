export type BundleType =
  | 'fixed_bundle'
  | 'gift_set'
  | 'starter_kit'
  | 'frequently_bought_together'
  | 'mix_and_match'
  | 'bogo';

export type BundleDiscountType =
  | 'percentage'
  | 'fixed'
  | 'free_item';

export interface ProductBundleItem {
  id?: string;
  bundleId?: string;
  productId: string;
  quantity: number;
  groupKey?: string | null;
  isRequired: boolean;
  sortOrder: number;
  product?: {
    id: string;
    name: string;
    slug?: string;
    price: number;
    image?: string | null;
    stockQuantity: number;
    availability?: string;
  };
}

export interface ProductBundle {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  bundleType: BundleType;
  discountType: BundleDiscountType;
  discountValue: number;
  minItems: number;
  maxItems?: number | null;
  buyQuantity?: number | null;
  getQuantity?: number | null;
  isActive: boolean;
  isFeatured: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  image?: string | null;
  metadata?: Record<string, unknown>;
  items: ProductBundleItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SelectedBundleItem {
  productId: string;
  quantity: number;
  groupKey?: string | null;
}

export interface BundlePriceBreakdown {
  bundleId: string;
  bundleName: string;
  quantity: number;
  originalUnitPrice: number;
  discountPerUnit: number;
  finalUnitPrice: number;
  originalTotal: number;
  discountTotal: number;
  finalTotal: number;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    free?: boolean;
  }>;
}
