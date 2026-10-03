import {
  BadGatewayException,
  Logger,
} from '@nestjs/common';
import type {
  ShippingProvider,
  ShippingRate,
  ShippingRateInput,
  ShipmentResult,
  TrackingResult,
} from '../schemas/shipping.schema.js';

export abstract class HttpShippingProvider
  implements ShippingProvider
{
  protected readonly logger = new Logger(
    HttpShippingProvider.name,
  );

  abstract readonly name: any;

  protected abstract getBaseUrl(): string;

  protected abstract getHeaders(): Record<string, string>;

  protected abstract mapRates(
    payload: any,
    input: ShippingRateInput,
  ): ShippingRate[];

  protected abstract mapShipment(
    payload: any,
    order: any,
  ): ShipmentResult;

  protected abstract mapTracking(
    payload: any,
    trackingNumber: string,
  ): TrackingResult;

  protected async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const baseUrl = this.getBaseUrl();

    if (!baseUrl) {
      throw new BadGatewayException(
        `${this.name} is not configured.`,
      );
    }

    const response = await fetch(
      `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`,
      {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...this.getHeaders(),
          ...(options.headers || {}),
        },
      },
    );

    const text = await response.text();

    let payload: any = null;

    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = text;
    }

    if (!response.ok) {
      this.logger.error(
        `${this.name} request failed: ${response.status}`,
      );

      throw new BadGatewayException(
        `${this.name} returned an error.`,
      );
    }

    return payload as T;
  }

  async calculateRate(
    input: ShippingRateInput,
  ): Promise<ShippingRate[]> {
    const payload = await this.request(
      this.ratePath(),
      {
        method: 'POST',
        body: JSON.stringify(
          this.rateRequestBody(input),
        ),
      },
    );

    return this.mapRates(payload, input);
  }

  async checkServiceability(
    originPincode: string,
    destinationPincode: string,
  ) {
    const payload = await this.request(
      this.serviceabilityPath(
        originPincode,
        destinationPincode,
      ),
      {
        method: 'GET',
      },
    );

    return this.mapServiceability(payload);
  }

  async createShipment(order: any): Promise<ShipmentResult> {
    const payload = await this.request(
      this.createShipmentPath(),
      {
        method: 'POST',
        body: JSON.stringify(
          this.shipmentRequestBody(order),
        ),
      },
    );

    return this.mapShipment(payload, order);
  }

  async trackShipment(
    trackingNumber: string,
  ): Promise<TrackingResult> {
    const payload = await this.request(
      this.trackingPath(trackingNumber),
      {
        method: 'GET',
      },
    );

    return this.mapTracking(payload, trackingNumber);
  }

  async cancelShipment(shipmentId: string) {
    await this.request(
      this.cancelShipmentPath(shipmentId),
      {
        method: 'POST',
        body: JSON.stringify({
          shipmentId,
        }),
      },
    );
  }

  async createReturnShipment(order: any, shipment: any) {
    const payload = await this.request(
      this.returnShipmentPath(),
      {
        method: 'POST',
        body: JSON.stringify(
          this.returnRequestBody(order, shipment),
        ),
      },
    );

    return this.mapShipment(payload, order);
  }

  protected ratePath(): string {
    return '/rates';
  }

  protected serviceabilityPath(
    _originPincode: string,
    _destinationPincode: string,
  ): string {
    return '/serviceability';
  }

  protected createShipmentPath(): string {
    return '/shipments';
  }

  protected trackingPath(trackingNumber: string): string {
    return `/shipments/${encodeURIComponent(trackingNumber)}`;
  }

  protected cancelShipmentPath(shipmentId: string): string {
    return `/shipments/${encodeURIComponent(shipmentId)}/cancel`;
  }

  protected returnShipmentPath(): string {
    return '/shipments/returns';
  }

  protected rateRequestBody(input: ShippingRateInput): any {
    return input;
  }

  protected shipmentRequestBody(order: any) {
    return order;
  }

  protected returnRequestBody(order: any, shipment: any) {
    return {
      order,
      shipment,
    };
  }

  protected mapServiceability(payload: any) {
    return {
      serviceable: Boolean(
        payload?.serviceable ??
          payload?.available ??
          payload?.success,
      ),
      message: payload?.message,
      raw: payload,
    };
  }
}
