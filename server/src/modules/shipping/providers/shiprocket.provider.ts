import { Injectable } from '@nestjs/common';
import { ShippingConfigService } from '../shipping-config.service.js';
import { HttpShippingProvider } from './http-shipping.provider.js';
import type {
  ShippingRate,
  ShippingRateInput,
  ShipmentResult,
  ShipmentStatus,
  TrackingResult,
} from '../schemas/shipping.schema.js';

@Injectable()
export class ShiprocketProvider
  extends HttpShippingProvider
{
  readonly name = 'shiprocket' as const;

  constructor(
    private readonly config: ShippingConfigService,
  ) {
    super();
  }

  protected getBaseUrl() {
    return process.env.SHIPROCKET_API_URL || '';
  }

  protected getHeaders(): Record<string, string> {
    return {
      Authorization:
        process.env.SHIPROCKET_TOKEN
          ? `Bearer ${process.env.SHIPROCKET_TOKEN}`
          : '',
    };
  }

  protected ratePath() {
    return '/courier/serviceability';
  }

  protected createShipmentPath() {
    return '/orders/create/adhoc';
  }

  protected trackingPath(trackingNumber: string) {
    return `/courier/track/awb/${encodeURIComponent(
      trackingNumber,
    )}`;
  }

  protected cancelShipmentPath(shipmentId: string) {
    return `/orders/cancel/${encodeURIComponent(shipmentId)}`;
  }

  protected rateRequestBody(input: ShippingRateInput) {
    return {
      pickup_postcode: input.origin.postalCode,
      delivery_postcode: input.destination.postalCode,
      weight: (input.packages || []).reduce(
        (sum, item) =>
          sum + (item.weightKg || 0.5) * Number(item.quantity || 1),
        0,
      ),
      cod: input.paymentMethod === 'cod' ? 1 : 0,
      declared_value: input.orderValue,
    };
  }

  protected shipmentRequestBody(order: any) {
    return {
      order_id: order.id,
      order_date: order.createdAt || new Date().toISOString(),
      pickup_location: order.pickupLocation || 'Primary',
      billing_customer_name: order.customer?.name,
      billing_address: order.deliveryAddress?.addressLine1,
      billing_address_2:
        order.deliveryAddress?.addressLine2,
      billing_city: order.deliveryAddress?.city,
      billing_pincode: order.deliveryAddress?.postalCode,
      billing_state: order.deliveryAddress?.state,
      billing_country:
        order.deliveryAddress?.country || 'India',
      billing_email: order.customer?.email,
      billing_phone: order.customer?.phone,
      order_items: order.items || [],
      payment_method:
        order.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
      sub_total: order.subtotal,
      length: order.package?.lengthCm || 20,
      breadth: order.package?.widthCm || 15,
      height: order.package?.heightCm || 8,
      weight: order.package?.weightKg || 0.5,
    };
  }

  protected mapRates(
    payload: any,
    input: ShippingRateInput,
  ): ShippingRate[] {
    const couriers =
      payload?.data?.available_courier_companies ||
      payload?.available_courier_companies ||
      [];

    return couriers.map((courier: any) => ({
      provider: this.name,
      serviceCode: String(
        courier.courier_company_id ||
          courier.id ||
          courier.name,
      ),
      serviceName:
        courier.courier_name ||
        courier.name ||
        'Shiprocket delivery',
      amount: Number(
        courier.rate ??
          courier.freight_charge ??
          courier.shipping_charge ??
          0,
      ),
      currency: input.currency || 'INR',
      estimatedDays: Number(
        courier.etd ||
          courier.estimated_delivery_days ||
          0,
      ) || undefined,
      estimatedDeliveryDate:
        courier.etd || undefined,
      codSupported: Boolean(
        courier.cod === 1 ||
          courier.cod === true,
      ),
      metadata: courier,
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
          data.order_id ||
          data.id ||
          order.id,
      ),
      trackingNumber:
        data.awb_code ||
        data.awb ||
        null,
      awbNumber:
        data.awb_code ||
        data.awb ||
        null,
      labelUrl:
        data.label_url ||
        data.label ||
        null,
      labelExpiresAt: null,
      status: this.mapStatus(
        data.status || data.current_status,
      ),
      shippingCost: Number(
        data.shipping_charges ||
          order.shippingCost ||
          0,
      ),
      currency: 'INR',
      estimatedDeliveryDate:
        data.etd || null,
      raw: payload,
    };
  }

  protected mapTracking(
    payload: any,
    trackingNumber: string,
  ): TrackingResult {
    const data = payload?.data || payload;
    const scans = data?.tracking_data?.shipment_track_activities ||
      data?.scans ||
      [];

    return {
      provider: this.name,
      trackingNumber,
      status: this.mapStatus(
        data?.tracking_data?.shipment_status ||
          data?.status,
      ),
      events: scans.map((scan: any) => ({
        status: this.mapStatus(
          scan.activity ||
            scan.status ||
            scan.current_status,
        ),
        location:
          scan.location ||
          scan.activity_location ||
          null,
        description:
          scan.activity ||
          scan.description ||
          null,
        eventTime:
          scan.date ||
          scan.timestamp ||
          new Date().toISOString(),
        providerEventId:
          scan.id ||
          scan.date ||
          null,
        raw: scan,
      })),
      estimatedDeliveryDate:
        data?.tracking_data?.etd || null,
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
    if (
      normalized.includes('pickup') &&
      normalized.includes('schedule')
    ) {
      return 'pickup_scheduled';
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

    return (
      settings.enabled &&
      Boolean(
        process.env.SHIPROCKET_API_URL &&
          process.env.SHIPROCKET_TOKEN,
      )
    );
  }
}
