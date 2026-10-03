export type NotificationChannel = 'email' | 'sms';

export interface NotificationMessage {
  to: string;
  subject?: string;
  html?: string;
  text?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationProvider {
  readonly name: string;
  readonly channel: NotificationChannel;

  send(message: NotificationMessage): Promise<{
    success: boolean;
    providerMessageId?: string;
    error?: string;
  }>;
}
