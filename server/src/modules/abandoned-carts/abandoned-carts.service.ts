import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service.js';
import { SmtpService } from '../auth/smtp/smtp.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { UpdateAbandonedCartSettingsDto } from './dto/update-recovery-settings.dto.js';
import {
  AbandonedCart,
  AbandonedCartItemDetail,
  AbandonedCartSettings,
  DEFAULT_ABANDONED_CART_SETTINGS,
} from './schemas/abandoned-cart.schema.js';
import {
  firstReminderTemplate,
  RecoveryTemplateInput,
} from './templates/first-reminder.template.js';
import { secondReminderTemplate } from './templates/second-reminder.template.js';

interface TrackingRecord {
  email?: string;
  firstReminderSentAt?: string | null;
  secondReminderSentAt?: string | null;
  recoveryEmailCount: number;
}

type TrackingMap = Record<string, TrackingRecord>;

@Injectable()
export class AbandonedCartsService {
  private readonly logger = new Logger(AbandonedCartsService.name);

  constructor(
    private readonly db: SupabaseService,
    private readonly smtpService: SmtpService,
    private readonly settingsService: SettingsService,
  ) {}

  async getSettings(): Promise<AbandonedCartSettings> {
    try {
      const { data } = await this.db
        .from('settings')
        .select('store')
        .eq('key', 'abandoned_carts')
        .maybeSingle();

      if (data?.store && typeof data.store === 'object') {
        return {
          ...DEFAULT_ABANDONED_CART_SETTINGS,
          ...data.store,
        };
      }

      if (this.settingsService?.getSettings) {
        const settings = await this.settingsService.getSettings();
        const stored = (settings as any)?.abandonedCarts || (settings as any)?.abandoned_carts;

        if (stored && typeof stored === 'object') {
          return {
            ...DEFAULT_ABANDONED_CART_SETTINGS,
            ...stored,
          };
        }
      }
    } catch (error) {
      this.logger.warn(
        `Could not read abandoned-cart settings: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return { ...DEFAULT_ABANDONED_CART_SETTINGS };
  }

  async updateSettings(
    dto: UpdateAbandonedCartSettingsDto,
  ): Promise<AbandonedCartSettings> {
    const current = await this.getSettings();
    const next = {
      ...current,
      ...Object.fromEntries(
        Object.entries(dto).filter(([, value]) => value !== undefined),
      ),
    };

    if (
      next.secondReminderDelayHours <= next.firstReminderDelayHours
    ) {
      throw new BadRequestException(
        'Second reminder delay must be greater than the first reminder delay.',
      );
    }

    await this.db.from('settings').upsert(
      {
        key: 'abandoned_carts',
        store: next,
      },
      { onConflict: 'key' },
    );

    if (this.settingsService?.updateSettings) {
      try {
        await this.settingsService.updateSettings({
          abandonedCarts: next,
        } as any);
      } catch {
        // Ignored
      }
    }

    return next;
  }

  private async getTrackingMap(): Promise<TrackingMap> {
    const { data, error } = await this.db
      .from('settings')
      .select('store')
      .eq('key', 'abandoned_cart_tracking')
      .maybeSingle();

    if (error) {
      this.logger.warn(`Could not read recovery tracking: ${error.message}`);
      return {};
    }

    return data?.store && typeof data.store === 'object'
      ? (data.store as TrackingMap)
      : {};
  }

  private async saveTracking(
    cartId: string,
    patch: Partial<TrackingRecord>,
  ): Promise<void> {
    const map = await this.getTrackingMap();
    map[cartId] = {
      ...(map[cartId] || { recoveryEmailCount: 0 }),
      ...patch,
    };

    const { error } = await this.db.from('settings').upsert(
      {
        key: 'abandoned_cart_tracking',
        store: map,
      },
      { onConflict: 'key' },
    );

    if (error) {
      throw new BadRequestException(
        `Could not save recovery tracking: ${error.message}`,
      );
    }
  }

  async setRecoveryEmail(cartId: string, email: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await this.db
      .from('carts')
      .update({
        recoveryEmail: normalizedEmail,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', cartId)
      .select('id, recoveryEmail')
      .maybeSingle();

    if (error) {
      // In case recoveryEmail column has not been added via SQL yet, track in tracking table
      await this.saveTracking(cartId, { email: normalizedEmail });
      return {
        success: true,
        cartId,
        email: normalizedEmail,
      };
    }

    if (!data) {
      throw new NotFoundException('Cart not found.');
    }

    await this.saveTracking(cartId, { email: normalizedEmail });

    return {
      success: true,
      cartId: data.id,
      email: data.recoveryEmail,
    };
  }

  private async getRawCarts(): Promise<any[]> {
    const { data, error } = await this.db
      .from('carts')
      .select('*')
      .order('updatedAt', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data || [];
  }

  private async enrichCart(
    cart: any,
    tracking: TrackingRecord | undefined,
    usersById: Map<string, any>,
    productsById: Map<string, any>,
    ordersByUser: Map<string, any[]>,
  ): Promise<AbandonedCart | null> {
    const items = Array.isArray(cart.items) ? cart.items : [];
    if (!items.length) return null;

    const updatedAt = new Date(
      cart.updatedAt || cart.createdAt || Date.now(),
    );
    const user = cart.user ? usersById.get(cart.user) : undefined;

    const email =
      cart.recoveryEmail ||
      cart.email ||
      user?.email ||
      tracking?.email ||
      '';

    if (!email) return null;

    const recoveredOrder = (ordersByUser.get(cart.user) || []).find(
      (order) =>
        new Date(order.createdAt).getTime() >= updatedAt.getTime() - 60_000,
    );

    const enrichedItems: AbandonedCartItemDetail[] = items.map((item: any) => {
      const product = productsById.get(item.product);
      const price = Number(
        item.price ?? item.unitPrice ?? product?.price ?? 0,
      );
      const quantity = Math.max(1, Number(item.quantity || 1));

      return {
        id:
          item.id ||
          `${item.product}-${item.selectedColor || ''}-${item.selectedSize || ''}`,
        productId: item.product,
        name: product?.name || item.name || 'Jewelry Piece',
        slug: product?.slug,
        price,
        quantity,
        selectedColor: item.selectedColor || 'Gold',
        selectedSize: item.selectedSize || 'Standard',
        image:
          item.image ||
          product?.thumbnail ||
          product?.image ||
          product?.images?.[0] ||
          null,
        subtotal: price * quantity,
      };
    });

    const subtotal = enrichedItems.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );
    const now = Date.now();

    return {
      id: String(cart.id),
      cartId: String(cart.id),
      user: cart.user || null,
      customer: {
        id: cart.user || undefined,
        name: user?.name || cart.customerName || 'Customer',
        email,
        phone: user?.phone || cart.phone || null,
      },
      items: enrichedItems,
      itemCount: enrichedItems.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      status: recoveredOrder
        ? 'recovered'
        : tracking?.firstReminderSentAt
          ? 'recovery_sent'
          : 'abandoned',
      abandonedAt: updatedAt.toISOString(),
      firstReminderSentAt: tracking?.firstReminderSentAt || null,
      secondReminderSentAt: tracking?.secondReminderSentAt || null,
      recoveryEmailCount: tracking?.recoveryEmailCount || 0,
      recoveredAt: recoveredOrder?.createdAt || null,
      recoveredOrderId: recoveredOrder?.orderId || recoveredOrder?.id || null,
      hoursAgo: Number(
        ((now - updatedAt.getTime()) / 3_600_000).toFixed(1),
      ),
    };
  }

  async getAbandonedCarts(options: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const settings = await this.getSettings();
    const threshold = settings.abandonmentThresholdMinutes * 60_000;
    const cutoff = Date.now() - threshold;
    const trackingMap = await this.getTrackingMap();
    const rawCarts = await this.getRawCarts();

    const carts = rawCarts.filter((cart) => {
      const updatedAt = new Date(
        cart.updatedAt || cart.createdAt || Date.now(),
      ).getTime();

      return (
        Array.isArray(cart.items) &&
        cart.items.length > 0 &&
        updatedAt <= cutoff
      );
    });

    const userIds = [
      ...new Set(carts.map((cart) => cart.user).filter(Boolean)),
    ];
    const productIds = [
      ...new Set(
        carts.flatMap((cart) =>
          (cart.items || []).map((item: any) => item.product),
        ),
      ),
    ];

    const [usersResult, productsResult, ordersResult] = await Promise.all([
      userIds.length
        ? this.db.from('users').select('*').in('id', userIds)
        : Promise.resolve({ data: [], error: null }),
      productIds.length
        ? this.db.from('products').select('*').in('id', productIds)
        : Promise.resolve({ data: [], error: null }),
      userIds.length
        ? this.db
            .from('orders')
            .select('*')
            .in('user', userIds)
            .neq('status', 'Cancelled')
        : Promise.resolve({ data: [], error: null }),
    ]);

    const usersById = new Map(
      (usersResult.data || []).map((user: any) => [user.id, user]),
    );
    const productsById = new Map(
      (productsResult.data || []).map((product: any) => [product.id, product]),
    );
    const ordersByUser = new Map<string, any[]>();

    for (const order of ordersResult.data || []) {
      const list = ordersByUser.get(order.user) || [];
      list.push(order);
      ordersByUser.set(order.user, list);
    }

    const enriched: AbandonedCart[] = [];

    for (const cart of carts) {
      const result = await this.enrichCart(
        cart,
        trackingMap[cart.id],
        usersById,
        productsById,
        ordersByUser,
      );

      if (result) enriched.push(result);
    }

    const stats = {
      totalAll: enriched.length,
      activePending: enriched.filter((cart) => cart.status !== 'recovered')
        .length,
      totalAbandoned: enriched.filter((cart) => cart.status === 'abandoned')
        .length,
      totalAbandonedValue: enriched
        .filter((cart) => cart.status !== 'recovered')
        .reduce((sum, cart) => sum + cart.subtotal, 0),
      recoveryEmailsSent: enriched.filter(
        (cart) => cart.status === 'recovery_sent',
      ).length,
      emailsSentTotal: enriched.reduce(
        (sum, cart) => sum + (cart.recoveryEmailCount || 0),
        0,
      ),
      recoveredCount: enriched.filter((cart) => cart.status === 'recovered')
        .length,
      recoveredValue: enriched
        .filter((cart) => cart.status === 'recovered')
        .reduce((sum, cart) => sum + cart.subtotal, 0),
      averageCartValue: enriched.length
        ? Math.round(
            enriched.reduce((sum, cart) => sum + cart.subtotal, 0) /
              enriched.length,
          )
        : 0,
    };

    const search = options.search?.trim().toLowerCase();

    const filtered = enriched.filter((cart) => {
      const statusMatches =
        !options.status ||
        options.status === 'all' ||
        cart.status === options.status;

      const searchMatches =
        !search ||
        cart.customer?.email.toLowerCase().includes(search) ||
        cart.customer?.name.toLowerCase().includes(search) ||
        cart.items.some((item) => item.name.toLowerCase().includes(search));

      return statusMatches && searchMatches;
    });

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const start = (page - 1) * limit;

    return {
      carts: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
      stats,
    };
  }

  async getStats() {
    const result = await this.getAbandonedCarts({ limit: 1 });
    return result.stats;
  }

  async getAbandonedCartById(id: string) {
    const result = await this.getAbandonedCarts({ limit: 1000 });
    const cart = result.carts.find(
      (item) => item.id === id || item.cartId === id || item.user === id,
    );

    if (!cart) {
      throw new NotFoundException('Abandoned cart not found.');
    }

    return cart;
  }

  private getCheckoutUrl(cartId: string): string {
    const base =
      process.env.STOREFRONT_URL ||
      process.env.FRONTEND_URL ||
      'http://localhost:5173';

    return `${base.replace(/\/$/, '')}/checkout?recoverCart=${encodeURIComponent(cartId)}`;
  }

  private async sendEmailForCart(
    cart: AbandonedCart,
    reminderNumber: 1 | 2,
    customMessage?: string,
  ) {
    if (!cart.customer?.email) {
      throw new BadRequestException('The cart has no customer email.');
    }

    const settings = await this.getSettings();
    const isSecond = reminderNumber === 2;

    const input: RecoveryTemplateInput = {
      customerName: cart.customer.name,
      items: cart.items,
      subtotal: cart.subtotal,
      checkoutUrl: this.getCheckoutUrl(cart.cartId),
      couponCode: isSecond ? settings.couponCode : undefined,
      couponPercentage: isSecond ? settings.couponPercentage : undefined,
    };

    const template = isSecond
      ? secondReminderTemplate(
          input,
          settings.secondReminderSubject,
          settings.secondReminderHeadline,
          customMessage || settings.secondReminderBody,
        )
      : firstReminderTemplate(
          input,
          settings.firstReminderSubject,
          settings.firstReminderHeadline,
          customMessage || settings.firstReminderBody,
        );

    const sent = await this.smtpService.sendMail({
      to: cart.customer.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (sent === false) {
      throw new BadRequestException('Recovery email could not be sent.');
    }

    const now = new Date().toISOString();
    const previousCount = cart.recoveryEmailCount || 0;

    await this.saveTracking(cart.cartId, {
      email: cart.customer.email,
      recoveryEmailCount: previousCount + 1,
      ...(isSecond
        ? { secondReminderSentAt: now }
        : { firstReminderSentAt: now }),
    });

    return {
      success: true,
      sentAt: now,
      reminderNumber,
      email: cart.customer.email,
    };
  }

  async sendRecoveryEmail(
    cartId: string,
    customMessage?: string,
    reminderNumber: 1 | 2 = 1,
  ) {
    const cart = await this.getAbandonedCartById(cartId);

    if (cart.status === 'recovered') {
      throw new BadRequestException(
        'This cart has already been recovered by an order.',
      );
    }

    return this.sendEmailForCart(cart, reminderNumber, customMessage);
  }

  async processAbandonedCarts() {
    const settings = await this.getSettings();

    if (!settings.enabled || !settings.autoRecoveryEmail) {
      return {
        processed: 0,
        sent: 0,
        skipped: 'Recovery is disabled',
        timestamp: new Date().toISOString(),
      };
    }

    const result = await this.getAbandonedCarts({
      status: 'abandoned',
      limit: 500,
    });

    let sent = 0;
    const now = Date.now();

    for (const cart of result.carts) {
      try {
        if (!cart.customer?.email || cart.status === 'recovered') continue;

        const abandonedAt = new Date(cart.abandonedAt).getTime();
        const firstDue =
          abandonedAt + settings.firstReminderDelayHours * 3_600_000;
        const secondDue =
          abandonedAt + settings.secondReminderDelayHours * 3_600_000;

        if (!cart.firstReminderSentAt && now >= firstDue) {
          await this.sendEmailForCart(cart, 1);
          sent++;
          continue;
        }

        if (
          cart.firstReminderSentAt &&
          !cart.secondReminderSentAt &&
          now >= secondDue
        ) {
          await this.sendEmailForCart(cart, 2);
          sent++;
        }
      } catch (error) {
        this.logger.error(
          `Could not process cart ${cart.cartId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return {
      processed: result.carts.length,
      sent,
      timestamp: new Date().toISOString(),
    };
  }
}
