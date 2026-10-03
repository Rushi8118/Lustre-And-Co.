import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ShippingService } from './shipping.service.js';

@Injectable()
export class ShippingScheduler {
  private readonly logger = new Logger(
    ShippingScheduler.name,
  );

  constructor(
    private readonly shippingService: ShippingService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async synchronizeTracking() {
    try {
      const settings =
        await this.shippingService.getSettings();

      if (!settings.autoSyncTracking) return;

      const result =
        await this.shippingService.synchronizeActiveShipments();

      this.logger.log(
        `Shipping tracking synchronized: ${result.synced} shipment(s) updated out of ${result.processed} active.`,
      );
    } catch (error) {
      this.logger.error(
        'Shipping tracking synchronization failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
