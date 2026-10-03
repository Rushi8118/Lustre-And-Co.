import { Injectable } from '@nestjs/common';
import { ShippingConfigService } from '../shipping-config.service.js';
import { HttpShippingProvider } from './http-shipping.provider.js';
import type {
  ShippingProviderName,
  ShippingRate,
  ShippingRateInput,
  ShipmentResult,
  ShipmentStatus,
  TrackingResult,
} from '../schemas/shipping.schema.js';

@Injectable()
export class ConfigurableHttpShippingProvider
  extends HttpShippingProvider
{
  constructor(
    readonly name: ShippingProviderName,
    private readonly config: ShippingConfigService,
  ) {
    super();
  }

  protected getBaseUrl() {
    const environmentKey = `${this.name
      .toUpperCase()
      .replace(/-/g, '_')}_API_URL`;

    return (
      process.env[environmentKey] ||
      ''
    );
  }

  protected getHeaders(): Record<string, string> {
    const tokenKey = `${this.name
      .toUpperCase()
      .replace(/-/g, '_')}_TOKEN`;

    const token = process.env[tokenKey];

    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {};
  }

  protected mapRates(
    payload: any,
    input: ShippingRateInput,
  ): ShippingRate[] {
    const rates =
      payload?.rates ||
      payload?.data?.rates ||
      payload?.services ||
      payload?.data?.services ||
      [];

    return rates.map((rate: any, index: number) => ({
      provider: this.name,
      serviceCode: String(
        rate.service_code ||
          rate.serviceCode ||
          rate.id ||
          index,
      ),
      serviceName:
        rate.service_name ||
        rate.serviceName ||
        rate.name ||
        `${this.name} delivery`,
      amount: Number(
        rate.amount ||
          rate.total ||
          rate.rate ||
          rate.price ||
          0,
      ),
      currency:
        rate.currency ||
        input.currency ||
        'INR',
      estimatedDays: Number(
        rate.estimated_days ||
          rate.estimatedDays ||
          rate.delivery_days ||
          0,
      ) || undefined,
      estimatedDeliveryDate:
        rate.estimated_delivery_date ||
        rate.estimatedDeliveryDate ||
        null,
      codSupported: Boolean(
        rate.cod_supported ??
          rate.codSupported ??
          true,
      ),
      metadata: rate,
    }));
  }

  protected mapShipment(
    payload: any,
    order: any,
  ): ShipmentResult {
    const data = payload?.data || payload;

    return {
      provider: this.name,
      providerShipmentId: String(
        data.shipment_id ||
          data.shipmentId ||
          data.id ||
          order.id,
      ),
      trackingNumber:
        data.tracking_number ||
        data.trackingNumber ||
        data.awb_number ||
        data.awb ||
        null,
      awbNumber:
        data.awb_number ||
        data.awb ||
        null,
      labelUrl:
        data.label_url ||
        data.labelUrl ||
        null,
      labelExpiresAt:
        data.label_expires_at ||
        data.labelExpiresAt ||
        null,
      status: this.mapStatus(
        data.status ||
          data.shipment_status ||
          'booked',
      ),
      shippingCost: Number(
        data.amount ||
          data.shipping_cost ||
          order.shippingCost ||
          0,
      ),
      currency: data.currency || 'INR',
      estimatedDeliveryDate:
        data.estimated_delivery_date ||
        data.estimatedDeliveryDate ||
        null,
      raw: payload,
    };
  }

  protected mapTracking(
    payload: any,
    trackingNumber: string,
  ): TrackingResult {
    const data = payload?.data || payload;
    const events =
      data.events ||
      data.tracking_events ||
      data.scans ||
      [];

    return {
      provider: this.name,
      trackingNumber,
      status: this.mapStatus(
        data.status ||
          data.current_status ||
          'in_transit',
      ),
      events: events.map((event: any) => ({
        status: this.mapStatus(
          event.status ||
            event.current_status ||
            event.description,
        ),
        location:
          event.location ||
          event.city ||
          null,
        description:
          event.description ||
          event.status ||
          null,
        eventTime:
          event.event_time ||
          event.eventTime ||
          event.timestamp ||
          new Date().toISOString(),
        providerEventId:
          event.id ||
          event.event_id ||
          null,
        raw: event,
      })),
      estimatedDeliveryDate:
        data.estimated_delivery_date ||
        data.estimatedDeliveryDate ||
        null,
      raw: payload,
    };
  }

  private mapStatus(value: unknown): ShipmentStatus {
    const normalized = String(value || '')
      .toLowerCase()
      .replace(/[\s-]+/g, '_');

    if (normalized.includes('deliver')) return 'delivered';
    if (normalized.includes('out_for')) {
      return 'out_for_delivery';
    }
    if (normalized.includes('pickup')) return 'picked_up';
    if (normalized.includes('transit')) return 'in_transit';
    if (normalized.includes('cancel')) return 'cancelled';
    if (normalized.includes('return')) return 'returned';
    if (
      normalized.includes('exception') ||
      normalized.includes('fail')
    ) {
      return 'exception';
    }

    return 'booked';
  }

  async isEnabled() {
    const settings = await this.config.getProviderSettings(
      this.name,
    );

    return settings.enabled && Boolean(this.getBaseUrl());
  }
}
