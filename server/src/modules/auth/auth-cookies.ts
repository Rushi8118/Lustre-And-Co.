import type { Response } from 'express';
import { REFRESH_TOKEN_TTL_DAYS } from './auth.service.js';

/**
 * Session tokens live in httpOnly cookies so page scripts can never read them.
 * The storefront reaches this API through a same-site proxy (see vercel.json),
 * so SameSite=Lax is enough and also blocks cross-site form CSRF.
 */
export const ACCESS_COOKIE = 'lc_access';
export const REFRESH_COOKIE = 'lc_refresh';

const ACCESS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const REFRESH_MAX_AGE_MS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
const REFRESH_PATH = '/api/auth';

const isProd = process.env.NODE_ENV === 'production';
const base = { httpOnly: true, secure: isProd, sameSite: 'lax' as const };

export function setAuthCookies(res: Response, tokens: { token?: string; refreshToken?: string }) {
  if (tokens.token) {
    res.cookie(ACCESS_COOKIE, tokens.token, { ...base, path: '/', maxAge: ACCESS_MAX_AGE_MS });
  }
  if (tokens.refreshToken) {
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, { ...base, path: REFRESH_PATH, maxAge: REFRESH_MAX_AGE_MS });
  }
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { ...base, path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...base, path: REFRESH_PATH });
}
