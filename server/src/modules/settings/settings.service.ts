import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_SETTINGS, SETTINGS_SECTIONS, StoreSettings } from './settings.defaults.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';
import { getRazorpayCredentials } from '../../common/utils/payments.js';
import { getGoogleCredentials } from '../../common/utils/google.js';
import { SupabaseService } from '../../database/supabase.service.js';
import { countOf, unwrap } from '../../common/utils/db.js';

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Deep-merges `override` onto `base`; arrays and primitives in `override` replace base values. */
function deepMerge<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return (override === undefined ? base : override) as T;
  }
  const result: Record<string, any> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    result[key] =
      isPlainObject(value) && isPlainObject(result[key]) ? deepMerge(result[key], value) : value;
  }
  return result as T;
}

/** Settings change rarely but are read on nearly every request (cart, checkout, reviews, dashboard). */
const SETTINGS_TTL_MS = 60 * 1000;
/** Storefront stats (customer count, rating) can lag slightly behind. */
const PUBLIC_STATS_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class SettingsService implements OnModuleInit {
  private settingsCache: { value: StoreSettings; expiresAt: number } | null = null;
  private statsCache: { value: Record<string, any>; expiresAt: number } | null = null;

  constructor(
    @Inject(SupabaseService) private readonly db: SupabaseService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  private readonly logger = new Logger(SettingsService.name);

  async onModuleInit() {
    try {
      unwrap(
        await this.db
          .from('settings')
          .upsert({ key: 'store', ...DEFAULT_SETTINGS }, { onConflict: 'key', ignoreDuplicates: true }),
      );
    } catch (err) {
      this.logger.error(
        'Could not reach the database. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server/.env, ' +
          'and make sure supabase/schema.sql has been run in your Supabase project.',
      );
      throw err;
    }
  }

  /** Full settings with defaults filled in for any section or field not yet saved. */
  async get(): Promise<StoreSettings> {
    if (this.settingsCache && this.settingsCache.expiresAt > Date.now()) {
      return this.settingsCache.value;
    }
    const value = await this.load();
    this.settingsCache = { value, expiresAt: Date.now() + SETTINGS_TTL_MS };
    return value;
  }

  private async load(): Promise<StoreSettings> {
    const row: Record<string, any> | null = unwrap(
      await this.db.from('settings').select('*').eq('key', 'store').maybeSingle(),
    );
    const saved: Record<string, any> = {};
    for (const section of SETTINGS_SECTIONS) {
      if (row?.[section]) saved[section] = row[section];
    }
    return deepMerge(DEFAULT_SETTINGS, saved);
  }

  async getCommerce() {
    return (await this.get()).commerce;
  }

  async getPublic() {
    const [settings, stats] = await Promise.all([this.get(), this.getPublicStats()]);
    const { configured, keyId } = getRazorpayCredentials(this.configService);

    return {
      ...settings,
      auth: {
        googleEnabled: getGoogleCredentials(this.configService).configured,
      },
      payments: {
        onlineEnabled: configured,
        razorpayKeyId: configured ? keyId : null,
        codEnabled: settings.commerce.codEnabled,
      },
      stats,
    };
  }

  private async getPublicStats() {
    if (this.statsCache && this.statsCache.expiresAt > Date.now()) {
      return this.statsCache.value;
    }
    const [customerCount, ratingStats] = await Promise.all([
      countOf(this.db.from('users').select('id', { count: 'exact', head: true }).eq('role', 'customer')),
      this.db.rpc<any[]>('review_stats'),
    ]);
    const stats = ratingStats?.[0];
    const value = {
      customerCount,
      reviewCount: Number(stats?.count || 0),
      averageRating: stats?.average ? Number(Number(stats.average).toFixed(1)) : null,
    };
    this.statsCache = { value, expiresAt: Date.now() + PUBLIC_STATS_TTL_MS };
    return value;
  }

  async update(dto: UpdateSettingsDto): Promise<StoreSettings> {
    const current = await this.get();
    const next = deepMerge(current, dto);
    unwrap(await this.db.from('settings').upsert({ key: 'store', ...next }, { onConflict: 'key' }));
    // Admin edits must show up immediately, not after the cache expires.
    this.settingsCache = { value: next, expiresAt: Date.now() + SETTINGS_TTL_MS };
    return next;
  }
}
