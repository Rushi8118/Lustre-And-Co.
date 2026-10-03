import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type {
  ShippingProvider,
  ShippingRateInput,
  ShippingRate,
  ShipmentResult,
  TrackingResult,
} from '../schemas/shipping.schema.js';

@Injectable()
export class StorePickupProvider
  implements ShippingProvider
{
  readonly name = 'store_pickup' as const;

  async calculateRate(
    input: ShippingRateInput,
  ): Promise<ShippingRate[]> {
    return [
      {
        provider: this.name,
        serviceCode: 'PICKUP',
        serviceName: 'Store pickup',
        amount: 0,
        currency: input.currency || 'INR',
        estimatedDays: 1,
        codSupported: false,
      },
    ];
  }

  async checkServiceability() {
    return {
      serviceable: true,
      message: 'Store pickup is available.',
    };
  }

  async createShipment(order: any): Promise<ShipmentResult> {
    const pickupCode = `PICKUP-${randomBytes(4)
      .toString('hex')
      .toUpperCase()}`;

    return {
      provider: this.name,
      providerShipmentId: pickupCode,
      trackingNumber: pickupCode,
      awbNumber: null,
      labelUrl: null,
      labelExpiresAt: null,
      status: 'pickup_scheduled',
      shippingCost: 0,
      currency: order.currency || 'INR',
      estimatedDeliveryDate: this.addDays(1),
      raw: {
        pickupCode,
        pickupInstructions:
          'Present this code at the store counter.',
      },
    };
  }

  async trackShipment(
    trackingNumber: string,
  ): Promise<TrackingResult> {
    return {
      provider: this.name,
      trackingNumber,
      status: 'pickup_scheduled',
      events: [
        {
          status: 'pickup_scheduled',
          location: 'Store',
          description: 'Order is ready for store pickup.',
          eventTime: new Date().toISOString(),
          providerEventId: `pickup-${trackingNumber}`,
        },
      ],
    };
  }

  async cancelShipment(_shipmentId: string) {
    return undefined;
  }

  async createReturnShipment(
    order: any,
  ): Promise<ShipmentResult> {
    return this.createShipment(order);
  }

  private addDays(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }
}
