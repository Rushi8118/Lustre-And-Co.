export type InventoryMovementType =
  | 'opening_stock'
  | 'purchase_received'
  | 'sale'
  | 'reservation'
  | 'reservation_release'
  | 'reservation_commit'
  | 'manual_adjustment'
  | 'damage'
  | 'damage_reversal'
  | 'return'
  | 'transfer_in'
  | 'transfer_out'
  | 'stock_count'
  | 'refund_restock'
  | 'write_off';

export type InventoryReservationStatus =
  | 'active'
  | 'committed'
  | 'released'
  | 'expired'
  | 'cancelled';

export type InventoryAlertType = 'low_stock' | 'out_of_stock';

export interface InventoryProduct {
  id: string;
  name: string;
  slug?: string;
  sku?: string | null;
  barcode?: string | null;
  stockQuantity: number;
  reservedStock: number;
  damagedStock: number;
  availableStock: number;
  reorderLevel: number;
  reorderQuantity: number;
  warehouseLocation?: string | null;
  supplierId?: string | null;
  costPrice?: number | null;
  isActive?: boolean;
  image?: string | null;
}

export interface InventoryReservation {
  id: string;
  reservationToken: string;
  cartId?: string | null;
  orderId?: string | null;
  userId?: string | null;
  status: InventoryReservationStatus;
  expiresAt: string;
  createdAt: string;
  committedAt?: string | null;
  releasedAt?: string | null;
}
