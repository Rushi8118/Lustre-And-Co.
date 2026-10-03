// server/src/modules/loyalty/loyalty.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoyaltyService } from './loyalty.service.js';

@Injectable()
export class LoyaltyScheduler {
  private readonly logger = new Logger(LoyaltyScheduler.name);

  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyLoyaltyJobs() {
    try {
      const [birthdayResult, expirationResult] = await Promise.allSettled([
        this.loyaltyService.processBirthdayRewards(),
        this.loyaltyService.expirePoints(),
      ]);

      const b = birthdayResult.status === 'fulfilled' ? birthdayResult.value : { rewarded: 0 };
      const e = expirationResult.status === 'fulfilled' ? expirationResult.value : { expired: 0 };

      this.logger.log(`Daily loyalty: birthday_rewards=${b.rewarded}, expired_points=${e.expired}`);
    } catch (err) {
      this.logger.error('Daily loyalty job failed', err instanceof Error ? err.stack : String(err));
    }
  }
}
