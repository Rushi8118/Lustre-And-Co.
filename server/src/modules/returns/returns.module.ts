import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module.js';
import { DocumentsModule } from '../documents/documents.module.js';
import { LoyaltyModule } from '../loyalty/loyalty.module.js';
import { ShippingModule } from '../shipping/shipping.module.js';
import { ReturnsController } from './returns.controller.js';
import { ReturnsService } from './returns.service.js';

@Module({
  imports: [
    SettingsModule,
    DocumentsModule,
    LoyaltyModule,
    ShippingModule,
  ],
  controllers: [ReturnsController],
  providers: [ReturnsService],
  exports: [ReturnsService],
})
export class ReturnsModule {}
