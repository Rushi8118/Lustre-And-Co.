import { Global, Module } from '@nestjs/common';
import { SmtpModule } from '../auth/smtp/smtp.module.js';
import { EmailNotificationProvider } from './email-notification.provider.js';
import { SmsNotificationProvider } from './sms-notification.provider.js';

@Global()
@Module({
  imports: [SmtpModule],
  providers: [
    EmailNotificationProvider,
    SmsNotificationProvider,
  ],
  exports: [
    EmailNotificationProvider,
    SmsNotificationProvider,
  ],
})
export class NotificationsModule {}
