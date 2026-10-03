import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AbandonedCartsService } from './abandoned-carts.service.js';

@Injectable()
export class AbandonedCartsScheduler {
  private readonly logger = new Logger(AbandonedCartsScheduler.name);

  constructor(
    private readonly abandonedCartsService: AbandonedCartsService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleAbandonedCartsCron() {
    try {
      const result =
        await this.abandonedCartsService.processAbandonedCarts();

      this.logger.log(
        `Abandoned-cart job completed: processed=${result.processed}, sent=${result.sent}`,
      );
    } catch (error) {
      this.logger.error(
        'Abandoned-cart job failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
