import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { SupabaseService } from '../../database/supabase.service.js';
import { ShippingConfigService } from './shipping-config.service.js';
import { ShippingProviderRegistry } from './shipping-provider.registry.js';
import {
  CalculateShippingRateDto,
} from './dto/calculate-shipping-rate.dto.js';
import { CreateShipmentDto } from './dto/create-shipment.dto.js';
import { CreateReturnShipmentDto } from './dto/create-return-shipment.dto.js';
import { UpdateShippingSettingsDto } from './dto/update-shipping-settings.dto.js';
import type {
  ShippingAddress,
  ShippingPackage,
  ShippingProviderName,
  ShipmentStatus,
} from './schemas/shipping.schema.js';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(
    ShippingService.name,
  );

  constructor(
    private readonly db: SupabaseService,
    private readonly config: ShippingConfigService,
    private readonly registry: ShippingProviderRegistry,
  ) {}

  private createQuoteToken() {
    return `QUOTE-${Date.now()}-${randomBytes(8)
      .toString('hex')
      .toUpperCase()}`;
  }

  private mapAddress(address: any): ShippingAddress {
    return {
      name: address?.name || address?.fullName || address?.recipient_name || '',
      phone: address?.phone || address?.mobile || '',
      email: address?.email || '',
      addressLine1:
        address?.addressLine1 ||
        address?.address ||
        address?.line1 ||
        address?.street ||
        '',
      addressLine2:
        address?.addressLine2 ||
        address?.line2 ||
        '',
      city: address?.city || '',
      state: address?.state || '',
      country: address?.country || 'IN',
      postalCode:
        (address?.postalCode ||
        address?.pincode ||
        address?.pinCode ||
        address?.zip ||
        '').toString().trim(),
    };
  }

  private mapPackages(
    packages: any[],
  ): ShippingPackage[] {
    return (packages || []).map((item) => ({
      lengthCm: Number(
        item.lengthCm || item.length || 20,
      ),
      widthCm: Number(
        item.widthCm || item.width || 15,
      ),
      heightCm: Number(
        item.heightCm || item.height || 8,
      ),
      weightKg: Number(
        item.weightKg || item.weight || 0.5,
      ),
      quantity: Number(item.quantity || 1),
      description: item.description,
    }));
  }

  async calculateRates(dto: CalculateShippingRateDto) {
    const settings = await this.config.getSettings();

    if (
      dto.deliveryMethod === 'store_pickup' ||
      dto.deliveryMethod === 'local_delivery'
    ) {
      const providerName =
        dto.deliveryMethod === 'store_pickup'
          ? 'store_pickup'
          : 'local_delivery';

      const provider = await this.registry.getEnabled(
        providerName,
      );

      const rates = await provider.calculateRate({
        origin: dto.origin,
        destination: dto.destination,
        packages: dto.packages,
        orderValue: dto.orderValue,
        paymentMethod: dto.paymentMethod,
        currency: dto.currency || 'INR',
        deliveryMethod: dto.deliveryMethod,
      });

      return this.persistRates(rates, dto);
    }

    const providerNames = [
      settings.defaultProvider,
      settings.fallbackProvider,
    ].filter(Boolean) as ShippingProviderName[];

    const uniqueProviders = [
      ...new Set(providerNames),
    ];

    const rates = [];

    for (const providerName of uniqueProviders) {
      try {
        const provider = await this.registry.getEnabled(
          providerName,
        );

        const serviceability =
          await provider.checkServiceability(
            dto.origin.postalCode,
            dto.destination.postalCode,
          );

        if (!serviceability.serviceable) continue;

        const providerRates = await provider.calculateRate({
          origin: dto.origin,
          destination: dto.destination,
          packages: dto.packages,
          orderValue: dto.orderValue,
          paymentMethod: dto.paymentMethod,
          currency: dto.currency || 'INR',
          deliveryMethod: dto.deliveryMethod || 'shipping',
        });

        rates.push(...providerRates);
      } catch (error) {
        this.logger.warn(
          `Shipping rate provider ${providerName} failed: ${
            error instanceof Error
              ? error.message
              : String(error)
          }`,
        );
      }
    }

    // If no provider returned rates, fallback to flat shipping rate if available
    if (!rates.length && settings.flatShippingRate > 0) {
      rates.push({
        provider: 'local_delivery' as ShippingProviderName,
        serviceCode: 'STANDARD_FLAT',
        serviceName: 'Standard Insured Delivery',
        amount: settings.flatShippingRate,
        currency: dto.currency || 'INR',
        estimatedDays: 3,
        codSupported: true,
      });
    }

    if (!rates.length) {
      throw new BadRequestException(
        'No shipping service is available for this address.',
      );
    }

    const adjustedRates = rates.map((rate) => {
      const freeThreshold =
        settings.freeShippingThreshold;

      if (
        freeThreshold !== null &&
        freeThreshold !== undefined &&
        dto.orderValue >= Number(freeThreshold)
      ) {
        return {
          ...rate,
          amount: 0,
          metadata: {
            ...(rate.metadata || {}),
            freeShipping: true,
          },
        };
      }

      return rate;
    });

    return this.persistRates(adjustedRates, dto);
  }

  private async persistRates(
    rates: any[],
    dto: CalculateShippingRateDto,
  ) {
    const expiresAt = new Date(
      Date.now() + 15 * 60 * 1000,
    ).toISOString();

    const quotes = [];

    for (const rate of rates) {
      const quoteToken = this.createQuoteToken();

      const { error } = await this.db
        .from('shipping_rate_quotes')
        .insert({
          quote_token: quoteToken,
          provider: rate.provider,
          service_code: rate.serviceCode,
          service_name: rate.serviceName,
          origin_pincode: dto.origin.postalCode,
          destination_pincode:
            dto.destination.postalCode,
          package_details: {
            packages: dto.packages,
            orderValue: dto.orderValue,
            paymentMethod: dto.paymentMethod,
          },
          amount: rate.amount,
          currency: rate.currency || 'INR',
          estimated_days: rate.estimatedDays || null,
          estimated_delivery_date:
            rate.estimatedDeliveryDate || null,
          expires_at: expiresAt,
        });

      if (error) {
        throw new BadRequestException(error.message);
      }

      quotes.push({
        ...rate,
        quoteToken,
        expiresAt,
      });
    }

    return {
      quotes,
      expiresAt,
    };
  }

  async checkServiceability(
    providerName: ShippingProviderName,
    originPincode: string,
    destinationPincode: string,
  ) {
    const provider = await this.registry.getEnabled(
      providerName,
    );

    return provider.checkServiceability(
      originPincode,
      destinationPincode,
    );
  }

  async getOrder(orderId: string) {
    const { data, error } = await this.db
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Order not found.');

    return data;
  }

  async getQuote(quoteToken: string) {
    const { data, error } = await this.db
      .from('shipping_rate_quotes')
      .select('*')
      .eq('quote_token', quoteToken)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!data) {
      throw new NotFoundException(
        'Shipping quote was not found.',
      );
    }

    if (new Date(data.expires_at) <= new Date()) {
      throw new BadRequestException(
        'Shipping quote has expired. Please calculate shipping again.',
      );
    }

    return data;
  }

  private async buildProviderOrder(
    order: any,
    quote?: any,
  ) {
    const deliveryAddress = this.mapAddress(
      order.shippingAddress ||
        order.deliveryAddress ||
        order.shipping_address ||
        order.address ||
        {},
    );

    const pickupAddress = this.mapAddress(
      order.pickupAddress ||
        (await this.config.getSettings()).pickupAddress ||
        {},
    );

    const items = Array.isArray(order.items)
      ? order.items
      : Array.isArray(order.products)
        ? order.products
        : [];

    return {
      ...order,
      customer: {
        name:
          order.customerName ||
          order.userName ||
          order.customer?.name ||
          deliveryAddress.name,
        email:
          order.email ||
          order.customerEmail ||
          order.customer?.email,
        phone:
          order.phone ||
          order.customerPhone ||
          order.customer?.phone ||
          deliveryAddress.phone,
      },
      pickupAddress,
      deliveryAddress,
      items,
      pickupLocation: order.pickupLocation,
      shippingCost: Number(
        quote?.amount ||
          order.shippingCost ||
          order.shipping_cost ||
          0,
      ),
      paymentMethod:
        order.paymentMethod ||
        order.payment_method ||
        'prepaid',
      subtotal: Number(
        order.subtotal ||
          order.total ||
          0,
      ),
      currency: order.currency || 'INR',
      package: {
        lengthCm: Number(
          order.package?.lengthCm || 20,
        ),
        widthCm: Number(
          order.package?.widthCm || 15,
        ),
        heightCm: Number(
          order.package?.heightCm || 8,
        ),
        weightKg: Number(
          order.package?.weightKg || 0.5,
        ),
      },
    };
  }

  async createShipment(dto: CreateShipmentDto) {
    const order = await this.getOrder(dto.orderId);

    const settings = await this.config.getSettings();
    const providerName: ShippingProviderName =
      dto.provider ||
      (order.shipping_provider as ShippingProviderName) ||
      (order.shippingProvider as ShippingProviderName) ||
      settings.defaultProvider;

    const provider = await this.registry.getEnabled(
      providerName,
    );

    const quoteToken = order.shipping_quote_token || order.shippingQuoteToken;
    const quote = quoteToken
      ? await this.getQuote(quoteToken)
      : undefined;

    const providerOrder = await this.buildProviderOrder(
      order,
      quote,
    );

    const result = await provider.createShipment(
      providerOrder,
    );

    const { data: shipment, error } = await this.db
      .from('shipping_shipments')
      .insert({
        order_id: order.id,
        provider: result.provider,
        service_code:
          quote?.service_code || dto.serviceCode || null,
        service_name:
          quote?.service_name || null,
        shipment_type: 'outbound',
        status: result.status,
        provider_shipment_id:
          result.providerShipmentId,
        tracking_number:
          result.trackingNumber || null,
        awb_number: result.awbNumber || null,
        label_url: result.labelUrl || null,
        label_expires_at:
          result.labelExpiresAt || null,
        pickup_address:
          providerOrder.pickupAddress,
        delivery_address:
          providerOrder.deliveryAddress,
        package_details:
          providerOrder.package,
        shipping_cost:
          result.shippingCost,
        cod_amount:
          order.paymentMethod === 'cod' || order.payment_method === 'cod'
            ? Number(order.total || 0)
            : 0,
        currency: result.currency || 'INR',
        estimated_delivery_date:
          result.estimatedDeliveryDate || null,
        provider_payload: result.raw || {},
      })
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    await this.db
      .from('orders')
      .update({
        shipping_provider: result.provider,
        shipping_shipment_id: shipment.id,
        tracking_number:
          result.trackingNumber || null,
        awb_number:
          result.awbNumber || null,
        shipping_label_url:
          result.labelUrl || null,
        shipping_status: result.status,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', order.id);

    return shipment;
  }

  async getShipment(id: string) {
    const { data, error } = await this.db
      .from('shipping_shipments')
      .select(
        `
        *,
        trackingEvents:shipping_tracking_events(*)
        `,
      )
      .eq('id', id)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!data) {
      throw new NotFoundException('Shipment not found.');
    }

    return data;
  }

  async getOrderShipments(orderId: string) {
    const { data, error } = await this.db
      .from('shipping_shipments')
      .select(
        `
        *,
        trackingEvents:shipping_tracking_events(*)
        `,
      )
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    return data || [];
  }

  async trackShipment(id: string) {
    const shipment = await this.getShipment(id);

    if (!shipment.tracking_number) {
      throw new BadRequestException(
        'This shipment has no tracking number.',
      );
    }

    const provider = await this.registry.getEnabled(
      shipment.provider,
    );

    const result = await provider.trackShipment(
      shipment.tracking_number,
    );

    const { error: shipmentError } = await this.db
      .from('shipping_shipments')
      .update({
        status: result.status,
        estimated_delivery_date:
          result.estimatedDeliveryDate || null,
        last_tracking_sync_at:
          new Date().toISOString(),
        provider_payload: result.raw || {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', shipment.id);

    if (shipmentError) {
      throw new BadRequestException(
        shipmentError.message,
      );
    }

    for (const event of result.events || []) {
      const { error } = await this.db
        .from('shipping_tracking_events')
        .upsert(
          {
            shipment_id: shipment.id,
            status: event.status,
            location: event.location || null,
            description: event.description || null,
            event_time: event.eventTime,
            provider_event_id:
              event.providerEventId || null,
            provider_payload: event.raw || {},
          },
          {
            onConflict:
              'shipment_id,provider_event_id',
          },
        );

      if (error) {
        this.logger.warn(
          `Could not save tracking event: ${error.message}`,
        );
      }
    }

    await this.db
      .from('orders')
      .update({
        shipping_status: result.status,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', shipment.order_id);

    return this.getShipment(id);
  }

  async cancelShipment(id: string) {
    const shipment = await this.getShipment(id);

    if (
      ['delivered', 'cancelled', 'returned'].includes(
        shipment.status,
      )
    ) {
      throw new BadRequestException(
        `Shipment cannot be cancelled in status ${shipment.status}.`,
      );
    }

    const provider = await this.registry.getEnabled(
      shipment.provider,
    );

    await provider.cancelShipment(
      shipment.provider_shipment_id,
    );

    const { data, error } = await this.db
      .from('shipping_shipments')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', shipment.id)
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);

    await this.db
      .from('orders')
      .update({
        shipping_status: 'cancelled',
        updatedAt: new Date().toISOString(),
      })
      .eq('id', shipment.order_id);

    return data;
  }

  async createReturnShipment(dto: CreateReturnShipmentDto) {
    const order = await this.getOrder(dto.orderId);
    const shipments = await this.getOrderShipments(dto.orderId);

    const outbound = shipments.find(
      (shipment: any) =>
        shipment.shipment_type === 'outbound',
    );

    if (!outbound) {
      throw new BadRequestException(
        'No outbound shipment exists for this order.',
      );
    }

    const provider = await this.registry.getEnabled(
      outbound.provider,
    );

    if (!provider.createReturnShipment) {
      throw new BadRequestException(
        `${outbound.provider} does not support return shipments.`,
      );
    }

    const providerOrder = await this.buildProviderOrder(
      order,
    );

    const result = await provider.createReturnShipment(
      {
        ...providerOrder,
        returnReason: dto.reason,
      },
      outbound,
    );

    const { data, error } = await this.db
      .from('shipping_shipments')
      .insert({
        order_id: order.id,
        parent_shipment_id: outbound.id,
        provider: result.provider,
        shipment_type: 'return',
        status: result.status,
        provider_shipment_id:
          result.providerShipmentId,
        tracking_number:
          result.trackingNumber || null,
        awb_number: result.awbNumber || null,
        label_url: result.labelUrl || null,
        label_expires_at:
          result.labelExpiresAt || null,
        pickup_address:
          outbound.delivery_address || {},
        delivery_address:
          outbound.pickup_address || {},
        package_details:
          outbound.package_details || {},
        shipping_cost:
          result.shippingCost,
        currency:
          result.currency || 'INR',
        estimated_delivery_date:
          result.estimatedDeliveryDate || null,
        provider_payload: {
          ...(result.raw || {}),
          reason: dto.reason || null,
        },
      })
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);

    return data;
  }

  async synchronizeActiveShipments() {
    const { data, error } = await this.db
      .from('shipping_shipments')
      .select('id')
      .in('status', [
        'booked',
        'pickup_scheduled',
        'picked_up',
        'in_transit',
        'out_for_delivery',
        'exception',
      ])
      .not('tracking_number', 'is', null)
      .limit(500);

    if (error) {
      throw new BadRequestException(error.message);
    }

    let synced = 0;

    for (const shipment of data || []) {
      try {
        await this.trackShipment(shipment.id);
        synced++;
      } catch (trackingError) {
        this.logger.warn(
          `Could not sync shipment ${shipment.id}: ${
            trackingError instanceof Error
              ? trackingError.message
              : String(trackingError)
          }`,
        );
      }
    }

    return {
      processed: data?.length || 0,
      synced,
    };
  }

  async listShipments(query: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    let q = this.db
      .from('shipping_shipments')
      .select(
        `
        *,
        trackingEvents:shipping_tracking_events(*)
        `,
        { count: 'exact' },
      )
      .order('created_at', { ascending: false });

    if (query.status && query.status !== 'all') {
      q = q.eq('status', query.status);
    }

    if (query.search) {
      const term = query.search.trim();
      q = q.or(
        `tracking_number.ilike.%${term}%,awb_number.ilike.%${term}%,provider_shipment_id.ilike.%${term}%`,
      );
    }

    const limit = query.limit || 50;
    const offset = query.offset || 0;
    q = q.range(offset, offset + limit - 1);

    const { data, count, error } = await q;

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      shipments: data || [],
      total: count || 0,
    };
  }

  verifyWebhookSignature(
    provider: string,
    rawBody: string,
    signature?: string,
  ): boolean {
    if (!signature) return false;

    const secret = process.env[
      `${provider.toUpperCase()}_WEBHOOK_SECRET`
    ];

    if (!secret) return false;

    const expected = createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const left = Buffer.from(expected);
    const right = Buffer.from(signature);

    return (
      left.length === right.length &&
      timingSafeEqual(left, right)
    );
  }

  async handleWebhook(
    providerName: ShippingProviderName,
    payload: any,
    signature?: string,
  ) {
    const externalEventId = String(
      payload.event_id ||
        payload.eventId ||
        payload.id ||
        `${Date.now()}-${randomBytes(4).toString('hex')}`,
    );

    const { data: existing } = await this.db
      .from('shipping_webhook_events')
      .select('id, processed_at')
      .eq('provider', providerName)
      .eq('external_event_id', externalEventId)
      .maybeSingle();

    if (existing?.processed_at) {
      return {
        processed: false,
        reason: 'already_processed',
      };
    }

    await this.db
      .from('shipping_webhook_events')
      .upsert(
        {
          provider: providerName,
          external_event_id: externalEventId,
          event_type:
            payload.event_type ||
            payload.eventType ||
            'tracking_update',
          payload,
        },
        {
          onConflict: 'provider,external_event_id',
        },
      );

    const trackingNumber =
      payload.tracking_number ||
      payload.trackingNumber ||
      payload.awb ||
      payload.awb_code;

    if (!trackingNumber) {
      throw new BadRequestException(
        'Webhook does not contain a tracking number.',
      );
    }

    const { data: shipment } = await this.db
      .from('shipping_shipments')
      .select('id, order_id')
      .or(
        `tracking_number.eq.${trackingNumber},awb_number.eq.${trackingNumber}`,
      )
      .maybeSingle();

    if (!shipment) {
      await this.db
        .from('shipping_webhook_events')
        .update({
          processed_at: new Date().toISOString(),
        })
        .eq('provider', providerName)
        .eq('external_event_id', externalEventId);

      return {
        processed: false,
        reason: 'shipment_not_found',
      };
    }

    const status = this.mapWebhookStatus(
      payload.status ||
        payload.current_status ||
        payload.event_type,
    );

    await this.db
      .from('shipping_shipments')
      .update({
        status,
        last_tracking_sync_at:
          new Date().toISOString(),
        provider_payload: payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shipment.id);

    await this.db
      .from('shipping_tracking_events')
      .insert({
        shipment_id: shipment.id,
        status,
        location:
          payload.location ||
          payload.city ||
          null,
        description:
          payload.description ||
          payload.status ||
          null,
        event_time:
          payload.event_time ||
          new Date().toISOString(),
        provider_event_id: externalEventId,
        provider_payload: payload,
      });

    await this.db
      .from('shipping_webhook_events')
      .update({
        processed_at: new Date().toISOString(),
      })
      .eq('provider', providerName)
      .eq('external_event_id', externalEventId);

    if (shipment.order_id) {
      await this.db
        .from('orders')
        .update({
          shipping_status: status,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', shipment.order_id);
    }

    return {
      processed: true,
      shipmentId: shipment.id,
      status,
    };
  }

  private mapWebhookStatus(value: unknown): ShipmentStatus {
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

  async getSettings() {
    return this.config.getSettings();
  }

  async updateSettings(dto: UpdateShippingSettingsDto) {
    return this.config.updateSettings({
      defaultProvider: dto.defaultProvider as any,
      fallbackProvider: dto.fallbackProvider as any,
      autoCreateShipments: dto.autoCreateShipments,
      autoSyncTracking: dto.autoSyncTracking,
      pickupAddress: dto.pickupAddress,
      localDeliveryEnabled:
        dto.localDeliveryEnabled,
      storePickupEnabled:
        dto.storePickupEnabled,
      freeShippingThreshold:
        dto.freeShippingThreshold,
      flatShippingRate: dto.flatShippingRate,
    });
  }

  async listProviders() {
    return this.registry.list();
  }
}
