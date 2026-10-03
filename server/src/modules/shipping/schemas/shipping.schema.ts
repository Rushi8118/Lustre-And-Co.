export type ShippingProviderName =
  | 'shiprocket'
  | 'delhivery'
  | 'blue_dart'
  | 'easyship'
  | 'shippo'
  | 'local_delivery'
  | 'store_pickup';

export type ShipmentType =
  | 'outbound'
  | 'return'
  | 'exchange';

export type ShipmentStatus =
  | 'pending'
  | 'booked'
  | 'pickup_scheduled'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'failed'
  | 'returned'
  | 'exception';

export type DeliveryMethod =
  | 'shipping'
  | 'local_delivery'
  | 'store_pickup';

export interface ShippingAddress {
  name: string;
  phone?: string;
  email?: string;

  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country?: string;
  postalCode: string;
  landmark?: string;
}

export interface ShippingPackage {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  quantity?: number;
  description?: string;
}

export interface ShippingRateInput {
  origin: ShippingAddress;
  destination: ShippingAddress;
  packages: ShippingPackage[];
  orderValue: number;
  paymentMethod?: string;
  currency?: string;
  deliveryMethod?: DeliveryMethod;
}

export interface ShippingRate {
  provider: ShippingProviderName;
  serviceCode: string;
  serviceName: string;
  amount: number;
  currency: string;
  estimatedDays?: number;
  estimatedDeliveryDate?: string;
  codSupported: boolean;
  metadata?: Record<string, unknown>;
}

export interface ShipmentResult {
  provider: ShippingProviderName;
  providerShipmentId: string;
  trackingNumber?: string | null;
  awbNumber?: string | null;
  labelUrl?: string | null;
  labelExpiresAt?: string | null;
  status: ShipmentStatus;
  shippingCost: number;
  currency: string;
  estimatedDeliveryDate?: string | null;
  raw?: Record<string, unknown>;
}

export interface TrackingEvent {
  status: ShipmentStatus;
  location?: string | null;
  description?: string | null;
  eventTime: string;
  providerEventId?: string | null;
  raw?: Record<string, unknown>;
}

export interface TrackingResult {
  provider: ShippingProviderName;
  trackingNumber: string;
  status: ShipmentStatus;
  events: TrackingEvent[];
  estimatedDeliveryDate?: string | null;
  raw?: Record<string, unknown>;
}

export interface ShippingProvider {
  readonly name: ShippingProviderName;

  calculateRate(input: ShippingRateInput): Promise<ShippingRate[]>;

  checkServiceability(
    originPincode: string,
    destinationPincode: string,
  ): Promise<{
    serviceable: boolean;
    message?: string;
    raw?: Record<string, unknown>;
  }>;

  createShipment(order: any): Promise<ShipmentResult>;

  trackShipment(
    trackingNumber: string,
  ): Promise<TrackingResult>;

  cancelShipment(shipmentId: string): Promise<void>;

  createReturnShipment?(
    order: any,
    shipment: any,
  ): Promise<ShipmentResult>;
}
