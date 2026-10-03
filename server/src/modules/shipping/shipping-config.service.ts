import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service.js';
import type {
  ShippingProviderName,
} from './schemas/shipping.schema.js';

@Injectable()
export class ShippingConfigService {
  constructor(private readonly db: SupabaseService) {}

  async getSettings() {
    const { data } = await this.db
      .from('shipping_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    return {
      defaultProvider:
        (data?.default_provider || 'local_delivery') as ShippingProviderName,
      fallbackProvider: (data?.fallback_provider || null) as ShippingProviderName | null,
      autoCreateShipments:
        data?.auto_create_shipments ?? false,
      autoSyncTracking:
        data?.auto_sync_tracking ?? true,
      pickupAddress: data?.pickup_address || {},
      localDeliveryEnabled:
        data?.local_delivery_enabled ?? true,
      storePickupEnabled:
        data?.store_pickup_enabled ?? true,
      freeShippingThreshold:
        data?.free_shipping_threshold !== null && data?.free_shipping_threshold !== undefined
          ? Number(data.free_shipping_threshold)
          : null,
      flatShippingRate: Number(
        data?.flat_shipping_rate || 0,
      ),
    };
  }

  async updateSettings(input: {
    defaultProvider?: ShippingProviderName;
    fallbackProvider?: ShippingProviderName | null;
    autoCreateShipments?: boolean;
    autoSyncTracking?: boolean;
    pickupAddress?: Record<string, unknown>;
    localDeliveryEnabled?: boolean;
    storePickupEnabled?: boolean;
    freeShippingThreshold?: number | null;
    flatShippingRate?: number;
  }) {
    const current = await this.getSettings();

    const next = {
      ...current,
      ...Object.fromEntries(
        Object.entries(input).filter(
          ([, value]) => value !== undefined,
        ),
      ),
    };

    const { data, error } = await this.db
      .from('shipping_settings')
      .upsert(
        {
          id: 1,
          default_provider: next.defaultProvider,
          fallback_provider: next.fallbackProvider,
          auto_create_shipments: next.autoCreateShipments,
          auto_sync_tracking: next.autoSyncTracking,
          pickup_address: next.pickupAddress,
          local_delivery_enabled:
            next.localDeliveryEnabled,
          store_pickup_enabled:
            next.storePickupEnabled,
          free_shipping_threshold:
            next.freeShippingThreshold,
          flat_shipping_rate: next.flatShippingRate,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      )
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    return {
      defaultProvider: data.default_provider,
      fallbackProvider: data.fallback_provider,
      autoCreateShipments: data.auto_create_shipments,
      autoSyncTracking: data.auto_sync_tracking,
      pickupAddress: data.pickup_address,
      localDeliveryEnabled: data.local_delivery_enabled,
      storePickupEnabled: data.store_pickup_enabled,
      freeShippingThreshold:
        data.free_shipping_threshold !== null ? Number(data.free_shipping_threshold) : null,
      flatShippingRate: Number(data.flat_shipping_rate || 0),
    };
  }

  async getProviderSettings(
    provider: ShippingProviderName,
  ) {
    const { data } = await this.db
      .from('shipping_provider_settings')
      .select('*')
      .eq('provider', provider)
      .maybeSingle();

    return {
      enabled: data?.enabled ?? false,
      credentials: data?.credentials || {},
      configuration: data?.configuration || {},
    };
  }

  async updateProviderSettings(
    provider: ShippingProviderName,
    input: {
      enabled?: boolean;
      credentials?: Record<string, unknown>;
      configuration?: Record<string, unknown>;
    },
  ) {
    const current = await this.getProviderSettings(provider);

    const next = {
      ...current,
      ...input,
    };

    const { data, error } = await this.db
      .from('shipping_provider_settings')
      .upsert(
        {
          provider,
          enabled: next.enabled,
          credentials: next.credentials,
          configuration: next.configuration,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'provider' },
      )
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    return data;
  }
}
