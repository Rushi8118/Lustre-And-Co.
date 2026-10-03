// server/src/modules/loyalty/loyalty.module.ts
import { Module } from '@nestjs/common';
import { LoyaltyController } from './loyalty.controller.js';
import { LoyaltyScheduler } from './loyalty.scheduler.js';
import { LoyaltyService } from './loyalty.service.js';

@Module({
  controllers: [LoyaltyController],
  providers: [LoyaltyService, LoyaltyScheduler],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
