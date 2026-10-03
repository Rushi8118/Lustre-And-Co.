import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ShippingConfigService } from './shipping-config.service.js';
import type {
  ShippingProvider,
  ShippingProviderName,
} from './schemas/shipping.schema.js';
import { LocalDeliveryProvider } from './providers/local-delivery.provider.js';
import { StorePickupProvider } from './providers/store-pickup.provider.js';
import { ShiprocketProvider } from './providers/shiprocket.provider.js';
import { ConfigurableHttpShippingProvider } from './providers/configurable-http.provider.js';

@Injectable()
export class ShippingProviderRegistry {
  private readonly providers = new Map<
    ShippingProviderName,
    ShippingProvider
  >();

  constructor(
    private readonly config: ShippingConfigService,
    private readonly localDelivery: LocalDeliveryProvider,
    private readonly storePickup: StorePickupProvider,
    private readonly shiprocket: ShiprocketProvider,
  ) {
    this.providers.set(
      'local_delivery',
      localDelivery,
    );

    this.providers.set(
      'store_pickup',
      storePickup,
    );

    this.providers.set('shiprocket', shiprocket);

    this.providers.set(
      'delhivery',
      new ConfigurableHttpShippingProvider(
        'delhivery',
        config,
      ),
    );

    this.providers.set(
      'blue_dart',
      new ConfigurableHttpShippingProvider(
        'blue_dart',
        config,
      ),
    );

    this.providers.set(
      'easyship',
      new ConfigurableHttpShippingProvider(
        'easyship',
        config,
      ),
    );

    this.providers.set(
      'shippo',
      new ConfigurableHttpShippingProvider(
        'shippo',
        config,
      ),
    );
  }

  get(name: ShippingProviderName): ShippingProvider {
    const provider = this.providers.get(name);

    if (!provider) {
      throw new BadRequestException(
        `Unsupported shipping provider: ${name}`,
      );
    }

    return provider;
  }

  async getEnabled(name: ShippingProviderName) {
    const provider = this.get(name);

    if (
      'isEnabled' in provider &&
      typeof (provider as any).isEnabled === 'function'
    ) {
      const enabled = await (provider as any).isEnabled();

      if (!enabled) {
        throw new BadRequestException(
          `Shipping provider ${name} is not configured or enabled.`,
        );
      }
    }

    return provider;
  }

  list(): ShippingProviderName[] {
    return [...this.providers.keys()];
  }
}
