import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AbandonedCartsController } from './abandoned-carts.controller.js';
import { AbandonedCartsScheduler } from './abandoned-carts.scheduler.js';
import { AbandonedCartsService } from './abandoned-carts.service.js';
import { SmtpModule } from '../auth/smtp/smtp.module.js';
import { SettingsModule } from '../settings/settings.module.js';

@Module({
  imports: [ScheduleModule, SmtpModule, SettingsModule],
  controllers: [AbandonedCartsController],
  providers: [AbandonedCartsService, AbandonedCartsScheduler],
  exports: [AbandonedCartsService],
})
export class AbandonedCartsModule {}
