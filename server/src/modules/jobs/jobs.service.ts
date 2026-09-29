import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../database/supabase.service.js';
import { SmtpService } from '../auth/smtp/smtp.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { unwrap } from '../../common/utils/db.js';

/** Wait this long after the last cart change before nudging the shopper. */
const ABANDONED_AFTER_HOURS = 4;
/** Give up on carts older than this: the nudge is no longer timely. */
const ABANDONED_GIVE_UP_HOURS = 72;
/** Missing column: PostgREST uses PGRST204 for writes, Postgres 42703 for filters. */
const MISSING_COLUMN_CODES = ['PGRST204', '42703'];

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @Inject(SupabaseService) private readonly db: SupabaseService,
    @Inject(SmtpService) private readonly smtpService: SmtpService,
    @Inject(SettingsService) private readonly settingsService: SettingsService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  /**
   * The jobs run on a public URL, so a shared secret stands in for a login.
   * Without JOB_SECRET set, the endpoints stay closed.
   */
  assertSecret(provided?: string) {
    const expected = this.configService.get<string>('JOB_SECRET') || '';
    if (!expected) {
      throw new UnauthorizedException('Background jobs are not enabled on this store.');
    }
    if (provided !== expected) {
      throw new UnauthorizedException('Invalid job secret.');
    }
  }

  /**
   * Emails signed-in shoppers who left items in their cart. Each cart is only
   * nudged once: "abandonedEmailSentAt" is stamped after a successful send and
   * cleared by the cart service whenever the cart changes again.
   */
  async sendAbandonedCartEmails() {
    const now = Date.now();
    const olderThan = new Date(now - ABANDONED_AFTER_HOURS * 60 * 60 * 1000).toISOString();
    const notBefore = new Date(now - ABANDONED_GIVE_UP_HOURS * 60 * 60 * 1000).toISOString();

    const query = await this.db
      .from('carts')
      .select('id, user, items, updatedAt')
      .is('abandonedEmailSentAt', null)
      .lt('updatedAt', olderThan)
      .gt('updatedAt', notBefore)
      .limit(50);

    if (query.error && MISSING_COLUMN_CODES.includes(query.error.code)) {
      const message =
        'The carts."abandonedEmailSentAt" column is missing. Run the migration in supabase/schema.sql before enabling this job.';
      this.logger.error(message);
      throw new ServiceUnavailableException(message);
    }

    const carts = unwrap(query) || [];

    let sent = 0;
    let skipped = 0;

    for (const cart of carts as any[]) {
      const items = Array.isArray(cart.items) ? cart.items : [];
      if (!items.length) {
        skipped += 1;
        continue;
      }

      const user = unwrap(
        await this.db.from('users').select('name, email').eq('id', cart.user).maybeSingle(),
      );
      if (!user?.email) {
        skipped += 1;
        continue;
      }

      // Price the cart from the products table; the cart only stores ids.
      const products =
        unwrap(
          await this.db
            .from('products')
            .select('id, name, price, isActive')
            .in(
              'id',
              items.map((item: any) => item.product).filter(Boolean),
            ),
        ) || [];
      const byId = new Map((products as any[]).map((product) => [product.id, product]));

      const lines = items
        .map((item: any) => {
          const product = byId.get(item.product);
          if (!product || product.isActive === false) return null;
          return { name: product.name, quantity: Number(item.quantity) || 1, price: Number(product.price) };
        })
        .filter(Boolean) as Array<{ name: string; quantity: number; price: number }>;

      if (!lines.length) {
        skipped += 1;
        continue;
      }

      const delivered = await this.smtpService.sendAbandonedCartEmail(user.email, user.name, lines);
      if (!delivered) {
        // SMTP is off or failed: leave the cart unstamped so it retries later.
        skipped += 1;
        continue;
      }

      unwrap(
        await this.db
          .from('carts')
          .update({ abandonedEmailSentAt: new Date().toISOString() })
          .eq('id', cart.id),
      );
      sent += 1;
    }

    this.logger.log(`Abandoned cart job: ${sent} email(s) sent, ${skipped} cart(s) skipped.`);
    return { success: true, considered: carts.length, sent, skipped };
  }

  /** Daily digest of everything at or below the low-stock level. */
  async sendLowStockDigest() {
    const { lowStockThreshold } = await this.settingsService.getCommerce();
    const products =
      unwrap(
        await this.db
          .from('products')
          .select('name, stockQuantity')
          .eq('isActive', true)
          .lte('stockQuantity', lowStockThreshold)
          .order('stockQuantity'),
      ) || [];

    if (!products.length) {
      return { success: true, products: 0, sent: false };
    }

    await this.smtpService.sendLowStockEmail(products as any, lowStockThreshold);
    return { success: true, products: products.length, sent: this.smtpService.isConfigured() };
  }
}
