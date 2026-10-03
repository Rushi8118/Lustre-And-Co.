import type { ConfigService } from '@nestjs/config';

/**
 * Returns the JWT signing secret. There is deliberately no fallback: a default
 * key would let anyone forge admin tokens on a misconfigured deployment.
 */
export function getJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  if (!secret) {
    throw new Error('JWT_SECRET is not configured. Set it before starting the server.');
  }
  return secret;
}
