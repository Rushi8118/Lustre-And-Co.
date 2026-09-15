import { Module } from '@nestjs/common';
import { SmtpService } from './smtp.service.js';

@Module({
  providers: [SmtpService],
  exports: [SmtpService],
})
export class SmtpModule {}
