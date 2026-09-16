import type { ConfigService } from '@nestjs/config';

const PLACEHOLDER_MARKERS = ['your-g', 'your_', 'placeholder', 'changeme', 'xxx'];

/** Google sign-in is only offered when real OAuth credentials are configured. */
export function getGoogleCredentials(config: ConfigService) {
  const clientId = config.get<string>('GOOGLE_CLIENT_ID') || '';
  const clientSecret = config.get<string>('GOOGLE_CLIENT_SECRET') || '';
  const callbackUrl =
    config.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:5000/api/auth/google/callback';

  const looksReal = (value: string) =>
    value.trim().length > 0 &&
    !PLACEHOLDER_MARKERS.some((marker) => value.toLowerCase().includes(marker));

  return {
    clientId,
    clientSecret,
    callbackUrl,
    configured: looksReal(clientId) && looksReal(clientSecret),
  };
}

/** First origin of FRONTEND_URL, which may hold a comma-separated list. */
export function getFrontendUrl(config: ConfigService) {
  return (config.get<string>('FRONTEND_URL') || 'http://localhost:5177').split(',')[0].trim();
}
