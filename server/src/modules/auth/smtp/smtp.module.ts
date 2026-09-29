import { Global, Module } from '@nestjs/common';
import { SmtpService } from './smtp.service.js';

/** Global: orders, admin, and the background jobs all send email. */
@Global()
@Module({
  providers: [SmtpService],
  exports: [SmtpService],
})
export class SmtpModule {}
