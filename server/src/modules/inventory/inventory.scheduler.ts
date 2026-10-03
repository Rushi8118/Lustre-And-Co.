import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InventoryService } from './inventory.service.js';

@Injectable()
export class InventoryScheduler {
  private readonly logger = new Logger(InventoryScheduler.name);

  constructor(private readonly inventoryService: InventoryService) {}

  /** Release expired checkout reservations every minute. */
  @Cron(CronExpression.EVERY_MINUTE)
  async releaseExpiredReservations() {
    try {
      const result = await this.inventoryService.releaseExpiredReservations();
      if (result.released > 0) {
        this.logger.log(
          `Released ${result.released} expired inventory reservation(s).`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Expired inventory reservation job failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /** Refresh low-stock and out-of-stock alerts every 30 minutes. */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async refreshInventoryAlerts() {
    try {
      await this.inventoryService.refreshAllAlerts();
    } catch (error) {
      this.logger.error(
        'Inventory alert refresh failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
