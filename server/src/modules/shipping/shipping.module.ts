import { Module } from '@nestjs/common';
import { ShippingConfigService } from './shipping-config.service.js';
import { ShippingController } from './shipping.controller.js';
import { ShippingProviderRegistry } from './shipping-provider.registry.js';
import { ShippingScheduler } from './shipping.scheduler.js';
import { ShippingService } from './shipping.service.js';
import { LocalDeliveryProvider } from './providers/local-delivery.provider.js';
import { StorePickupProvider } from './providers/store-pickup.provider.js';
import { ShiprocketProvider } from './providers/shiprocket.provider.js';

@Module({
  controllers: [ShippingController],
  providers: [
    ShippingConfigService,
    ShippingProviderRegistry,
    ShippingScheduler,
    ShippingService,
    LocalDeliveryProvider,
    StorePickupProvider,
    ShiprocketProvider,
  ],
  exports: [
    ShippingConfigService,
    ShippingProviderRegistry,
    ShippingService,
  ],
})
export class ShippingModule {}
