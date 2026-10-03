import { Injectable } from '@nestjs/common';
import { SmtpService } from '../auth/smtp/smtp.service.js';
import type {
  NotificationMessage,
  NotificationProvider,
} from './notification.schema.js';

@Injectable()
export class EmailNotificationProvider implements NotificationProvider {
  readonly name = 'smtp';
  readonly channel = 'email' as const;

  constructor(private readonly smtp: SmtpService) {}

  async send(message: NotificationMessage) {
    const sent = await this.smtp.sendMail({
      to: message.to,
      subject: message.subject || '',
      html: message.html || '',
      text: message.text,
    });

    return {
      success: sent,
      error: sent ? undefined : 'SMTP delivery failed.',
    };
  }
}
