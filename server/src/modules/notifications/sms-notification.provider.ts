import { Injectable, Logger } from '@nestjs/common';
import type {
  NotificationMessage,
  NotificationProvider,
} from './notification.schema.js';

@Injectable()
export class SmsNotificationProvider implements NotificationProvider {
  private readonly logger = new Logger(SmsNotificationProvider.name);

  readonly name = 'sms_provider';
  readonly channel = 'sms' as const;

  async send(message: NotificationMessage) {
    if (!message.to) {
      return {
        success: false,
        error: 'Phone number is missing.',
      };
    }

    // Provider abstraction for SMS gateway (e.g. Twilio, MSG91, Textlocal)
    this.logger.log(`[SMS Gateway Simulated Delivery] To: ${message.to} | Text: ${message.text?.slice(0, 60)}...`);

    return {
      success: true,
      providerMessageId: `SMS-${Date.now()}`,
    };
  }
}
