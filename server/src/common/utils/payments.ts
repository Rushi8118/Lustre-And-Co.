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
