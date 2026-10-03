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
export class LocalDeliveryProvider
  implements ShippingProvider
{
  readonly name = 'local_delivery' as const;

  private readonly prefix = 'LOCAL';

  private isLocalPincode(pincode: string): boolean {
    return /^\d{6}$/.test(String(pincode || '').trim());
  }

  async calculateRate(
    input: ShippingRateInput,
  ): Promise<ShippingRate[]> {
    if (
      !this.isLocalPincode(
        input.destination.postalCode,
      )
    ) {
      return [];
    }

    const totalWeight = (input.packages || []).reduce(
      (sum, item) =>
        sum + (item.weightKg || 0.5) * Number(item.quantity || 1),
      0,
    );

    const amount = totalWeight <= 1 ? 60 : 60 + (totalWeight - 1) * 25;

    return [
      {
        provider: this.name,
        serviceCode: 'LOCAL_STANDARD',
        serviceName: 'Local delivery',
        amount: Math.round(amount),
        currency: input.currency || 'INR',
        estimatedDays: 1,
        codSupported: true,
        metadata: {
          totalWeight,
        },
      },
    ];
  }

  async checkServiceability(
    _originPincode: string,
    destinationPincode: string,
  ) {
    const serviceable = this.isLocalPincode(
      destinationPincode,
    );

    return {
      serviceable,
      message: serviceable
        ? 'Local delivery is available.'
        : 'Enter a valid six-digit pincode.',
    };
  }

  async createShipment(order: any): Promise<ShipmentResult> {
    const trackingNumber = `${this.prefix}-${randomBytes(5)
      .toString('hex')
      .toUpperCase()}`;

    return {
      provider: this.name,
      providerShipmentId: `LOCAL-SHIP-${randomBytes(6)
        .toString('hex')
        .toUpperCase()}`,
      trackingNumber,
      awbNumber: trackingNumber,
      labelUrl: null,
      labelExpiresAt: null,
      status: 'booked',
      shippingCost: Number(order.shippingCost || 0),
      currency: order.currency || 'INR',
      estimatedDeliveryDate: this.addDays(1),
      raw: {
        local: true,
      },
    };
  }

  async trackShipment(
    trackingNumber: string,
  ): Promise<TrackingResult> {
    return {
      provider: this.name,
      trackingNumber,
      status: 'in_transit',
      events: [
        {
          status: 'in_transit',
          location: 'Local dispatch center',
          description: 'Shipment is moving through local delivery.',
          eventTime: new Date().toISOString(),
          providerEventId: `local-event-${trackingNumber}`,
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
    const result = await this.createShipment(order);

    return {
      ...result,
      providerShipmentId: `LOCAL-RETURN-${randomBytes(6)
        .toString('hex')
        .toUpperCase()}`,
      status: 'booked',
      raw: {
        local: true,
        return: true,
      },
    };
  }

  private addDays(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }
}
