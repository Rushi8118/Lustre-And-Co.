import { Module } from '@nestjs/common';
import { MarketingController } from './marketing.controller.js';
import { MarketingScheduler } from './marketing.scheduler.js';
import { MarketingService } from './marketing.service.js';
import { SmtpModule } from '../auth/smtp/smtp.module.js';

@Module({
  imports: [SmtpModule],
  controllers: [MarketingController],
  providers: [MarketingService, MarketingScheduler],
  exports: [MarketingService],
})
export class MarketingModule {}
