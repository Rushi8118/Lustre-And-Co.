import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import crypto from 'crypto';

/**
 * Chooses what a rate limit counts against. Login and password reset count per
 * account, so a botnet cannot spread guesses across IPs. The 2FA challenge counts
 * per pending session. Everything else counts per client IP.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const path = String(req.path || req.url || '');
    const body = req.body || {};

    if (path.endsWith('/auth/login') || path.endsWith('/auth/forgot-password')) {
      return `account:${String(body.email || '').toLowerCase().trim()}`;
    }
    if (path.endsWith('/auth/2fa/verify')) {
      const token = crypto.createHash('sha256').update(String(body.tempToken || '')).digest('hex');
      return `2fa:${token}`;
    }
    return `ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
  }
}
