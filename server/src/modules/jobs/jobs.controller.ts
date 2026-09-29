import { Controller, Headers, HttpCode, Inject, Post } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { JobsService } from './jobs.service.js';

/**
 * Scheduled work, triggered by an external cron (GitHub Actions) because the
 * free hosting plan sleeps an idle server and cannot run timers reliably.
 * Hidden from Swagger: these are not part of the public API.
 */
@ApiExcludeController()
@Controller('jobs')
export class JobsController {
  constructor(@Inject(JobsService) private readonly jobsService: JobsService) {}

  @Post('abandoned-carts')
  @HttpCode(200)
  async abandonedCarts(@Headers('x-job-secret') secret: string) {
    this.jobsService.assertSecret(secret);
    return this.jobsService.sendAbandonedCartEmails();
  }

  @Post('low-stock-digest')
  @HttpCode(200)
  async lowStockDigest(@Headers('x-job-secret') secret: string) {
    this.jobsService.assertSecret(secret);
    return this.jobsService.sendLowStockDigest();
  }
}
