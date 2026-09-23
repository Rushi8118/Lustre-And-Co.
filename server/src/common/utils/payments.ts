import type { ConfigService } from '@nestjs/config';

const PLACEHOLDER_MARKERS = ['test_lustre2026', 'placeholder', 'mock'];

/** Online payments are only offered when real Razorpay credentials are configured. */
export function getRazorpayCredentials(config: ConfigService) {
  const keyId = config.get<string>('RAZORPAY_KEY_ID') || '';
  const keySecret = config.get<string>('RAZORPAY_KEY_SECRET') || '';
  const looksReal = (value: string) =>
    value.length > 0 && !PLACEHOLDER_MARKERS.some((marker) => value.includes(marker));

  return {
    keyId,
    keySecret,
    configured: looksReal(keyId) && looksReal(keySecret),
  };
}

/**
 * Razorpay signs webhook deliveries with a secret you choose in the dashboard.
 * Without it we cannot trust webhook calls, so the endpoint stays disabled.
 */
export function getRazorpayWebhookSecret(config: ConfigService) {
  const secret = config.get<string>('RAZORPAY_WEBHOOK_SECRET') || '';
  const looksReal =
    secret.length > 0 && !PLACEHOLDER_MARKERS.some((marker) => secret.includes(marker));
  return looksReal ? secret : '';
}
