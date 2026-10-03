import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller.js';
import { InventoryScheduler } from './inventory.scheduler.js';
import { InventoryService } from './inventory.service.js';
import { MarketingModule } from '../marketing/marketing.module.js';

@Module({
  imports: [MarketingModule],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryScheduler],
  exports: [InventoryService],
})
export class InventoryModule {}
