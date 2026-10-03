import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { OrdersService } from './orders.service.js';
import { OrdersController } from './orders.controller.js';
import { DiscountsModule } from '../discounts/discounts.module.js';
import { BundlesModule } from '../bundles/bundles.module.js';
import { LoyaltyModule } from '../loyalty/loyalty.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { ShippingModule } from '../shipping/shipping.module.js';
import { AnalyticsModule } from '../analytics/analytics.module.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    DiscountsModule,
    BundlesModule,
    LoyaltyModule,
    InventoryModule,
    ShippingModule,
    AnalyticsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
