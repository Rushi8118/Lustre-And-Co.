import { Global, Module } from '@nestjs/common';
import { SmtpService } from './smtp.service.js';

@Global()
@Module({
  providers: [SmtpService],
  exports: [SmtpService],
})
export class SmtpModule {}
