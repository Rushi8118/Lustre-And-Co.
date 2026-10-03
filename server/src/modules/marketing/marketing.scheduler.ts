import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MarketingService } from './marketing.service.js';

@Injectable()
export class MarketingScheduler {
  private readonly logger = new Logger(MarketingScheduler.name);

  constructor(
    private readonly marketingService: MarketingService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async sendScheduledCampaigns() {
    try {
      const result = await this.marketingService.processScheduledCampaigns();

      if (result.processed > 0) {
        this.logger.log(
          `Processed ${result.processed} scheduled campaign(s) (discovered ${result.discovered}).`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Scheduled marketing campaign job failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
