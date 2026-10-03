import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import type { OrderDocument } from './schemas/order.schema.js';
import type { ProductDocument } from '../products/schemas/product.schema.js';
import { DiscountsService } from '../discounts/discounts.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { SettingsService } from '../settings/settings.service.js';
import { BundlesService } from '../bundles/bundles.service.js';
import { validateOrderBundles } from './utils/order-bundle-validation.js';
import type { UserDocument } from '../users/schemas/user.schema.js';
import { SupabaseService } from '../../database/supabase.service.js';
import { LoyaltyService } from '../loyalty/loyalty.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { ShippingService } from '../shipping/shipping.service.js';
import { AnalyticsService } from '../analytics/analytics.service.js';
import { ADMIN_ROLES } from '../../common/constants/roles-permissions.js';
import {
  countOf,
  escapeLike,
  idOrColumn,
  isUuid,
  quoteFilterValue,
  toDoc,
  toDocs,
  unwrap,
} from '../../common/utils/db.js';
import { getRazorpayCredentials } from '../../common/utils/payments.js';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class OrdersService {
  constructor(
    @Inject(SupabaseService) private readonly db: SupabaseService,
    @Inject(DiscountsService) private readonly discountsService: DiscountsService,
    @Inject(SettingsService) private readonly settingsService: SettingsService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(BundlesService) private readonly bundlesService: BundlesService,
    @Inject(LoyaltyService) private readonly loyaltyService: LoyaltyService,
    @Inject(InventoryService) private readonly inventoryService: InventoryService,
    @Inject(ShippingService) private readonly shippingService: ShippingService,
    @Inject(AnalyticsService) private readonly analyticsService: AnalyticsService,
  ) {}

  private async generateOrderId(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = `LST-${crypto.randomInt(10_000_000, 100_000_000)}`;
      const taken = await countOf(
        this.db.from('orders').select('id', { count: 'exact', head: true }).eq('orderId', candidate),
      );
      if (!taken) return candidate;
    }
    return `LST-${Date.now()}`;
  }

  private async releaseStock(reserved: Array<{ id: string; quantity: number }>) {
    for (const line of reserved) {
      await this.db.rpc('release_product_stock', { p_id: line.id, p_qty: line.quantity });
    }
  }

  async createOrder(dto: CreateOrderDto, userId?: string) {
    const orderItems = dto.items || [];
    const orderBundleItems = dto.bundleItems || [];
    if (orderItems.length === 0 && orderBundleItems.length === 0) {
      throw new BadRequestException('Cannot create an order with an empty bag.');
    }

    const commerce = await this.settingsService.getCommerce();
    const paymentMethod = dto.paymentMethod || 'cod';

    if (paymentMethod === 'cod' && !commerce.codEnabled) {
      throw new BadRequestException('Cash on delivery is currently unavailable.');
    }
    if (paymentMethod === 'razorpay' && !getRazorpayCredentials(this.configService).configured) {
      throw new BadRequestException('Online payments are not available right now. Please choose cash on delivery.');
    }

    // 1. Validate bundles and compute bundle total server-side
    const bundleValidation = await validateOrderBundles(
      this.bundlesService,
      orderBundleItems,
    );

    // 2. Price every line from the database (client prices are never trusted).
    const lines: Array<{ product: ProductDocument; quantity: number; color: string; size: string }> = [];
    const requestedByProduct = new Map<string, number>();

    // Seed requestedByProduct with quantities from bundles
    for (const bundle of bundleValidation.bundles) {
      for (const item of bundle.selectedItems) {
        const bundleRequested = item.quantity * bundle.price.quantity;
        requestedByProduct.set(
          item.productId,
          (requestedByProduct.get(item.productId) || 0) + bundleRequested,
        );
      }
    }

    for (const item of orderItems) {
      const row = unwrap(
        await this.db
          .from('products')
          .select('*')
          .or(idOrColumn(item.productId, 'slug'))
          .eq('isActive', true)
          .limit(1)
          .maybeSingle(),
      );
      if (!row) {
        throw new BadRequestException(`A product in your bag ('${item.productId}') is no longer available.`);
      }
      const product = toDoc<any>(row) as ProductDocument;

      const totalRequested = (requestedByProduct.get(product.id) || 0) + item.quantity;
      requestedByProduct.set(product.id, totalRequested);

      if (totalRequested > product.stockQuantity) {
        throw new BadRequestException(
          product.stockQuantity > 0
            ? `Only ${product.stockQuantity} of "${product.name}" left in stock.`
            : `"${product.name}" is out of stock.`,
        );
      }

      lines.push({
        product,
        quantity: item.quantity,
        color: item.color || product.availableColors?.[0] || 'Gold',
        size: item.size || product.availableSizes?.[0] || 'Standard',
      });
    }

    const productSubtotal = lines.reduce((sum, line) => sum + Number(line.product.price) * line.quantity, 0);
    const bundleSubtotal = bundleValidation.bundleTotal;
    const subtotal = productSubtotal + bundleSubtotal;

    // 3. Promo code
    let discount = 0;
    let freeShippingCoupon = false;
    let promoCode: string | undefined;
    if (dto.promoCode && dto.promoCode.trim()) {
      const promo = await this.discountsService.validateCoupon(dto.promoCode, subtotal);
      discount = promo.discountAmount || 0;
      freeShippingCoupon = Boolean(promo.freeShipping);
      promoCode = promo.code;
    }

    // 4. Shipping quote validation & authoritative rate resolution
    let validatedQuote: any = null;
    if (dto.shippingQuoteToken) {
      try {
        validatedQuote = await this.shippingService.getQuote(dto.shippingQuoteToken);
      } catch (err) {
        throw new BadRequestException(
          err instanceof Error ? err.message : 'Invalid or expired shipping quote. Please recalculate delivery options.',
        );
      }
    }

    const qualifiesForFreeShipping = subtotal >= commerce.freeShippingThreshold || freeShippingCoupon;
    let shippingFee = qualifiesForFreeShipping ? 0 : commerce.shippingFee;
    let carrierName = 'Bluedart Air Express';

    if (validatedQuote) {
      shippingFee = qualifiesForFreeShipping ? 0 : Number(validatedQuote.amount || 0);
      carrierName = validatedQuote.service_name || validatedQuote.serviceName || carrierName;
    }

    const isExpress = dto.deliveryOption === 'express';
    const deliverySurcharge = !validatedQuote && isExpress ? commerce.expressShippingFee : 0;
    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = Math.round((taxableAmount * commerce.taxPercent) / 100);
    const total = taxableAmount + shippingFee + deliverySurcharge + tax;

    // 5. Reserve stock atomically so two shoppers cannot buy the last unit.
    const reserved: Array<{ id: string; quantity: number }> = [];
    try {
      for (const line of lines) {
        const ok = await this.db.rpc<boolean>('reserve_product_stock', {
          p_id: line.product.id,
          p_qty: line.quantity,
        });
        if (!ok) {
          throw new BadRequestException(`"${line.product.name}" just sold out. Please update your bag.`);
        }
        reserved.push({ id: line.product.id, quantity: line.quantity });
      }

      for (const bundle of bundleValidation.bundles) {
        for (const item of bundle.selectedItems) {
          const qtyToReserve = item.quantity * bundle.price.quantity;
          const ok = await this.db.rpc<boolean>('reserve_product_stock', {
            p_id: item.productId,
            p_qty: qtyToReserve,
          });
          if (!ok) {
            throw new BadRequestException(`A product in the bundle "${bundle.bundle.name}" just sold out.`);
          }
          reserved.push({ id: item.productId, quantity: qtyToReserve });
        }
      }
    } catch (err) {
      await this.releaseStock(reserved);
      throw err;
    }

    // 6. Persist the order and its payment ledger entry.
    const now = new Date();
    const [startDays, endDays] = isExpress ? [1, 2] : [3, 5];
    const dateOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    let estimatedDeliveryDate = `${new Date(now.getTime() + startDays * DAY_MS).toLocaleDateString('en-US', dateOpts)} – ${new Date(now.getTime() + endDays * DAY_MS).toLocaleDateString('en-US', dateOpts)}`;

    if (validatedQuote?.estimatedMinDays && validatedQuote?.estimatedMaxDays) {
      estimatedDeliveryDate = `${new Date(now.getTime() + validatedQuote.estimatedMinDays * DAY_MS).toLocaleDateString('en-US', dateOpts)} – ${new Date(now.getTime() + validatedQuote.estimatedMaxDays * DAY_MS).toLocaleDateString('en-US', dateOpts)}`;
    }

    let order: OrderDocument;
    try {
      const row = unwrap(
        await this.db
          .from('orders')
          .insert({
            orderId: await this.generateOrderId(),
            user: userId ? userId.toString() : null,
            customer: {
              fullName: dto.customer.fullName.trim(),
              email: dto.customer.email.toLowerCase().trim(),
              phone: dto.customer.phone.trim(),
            },
            shippingAddress: {
              address: dto.shippingAddress.address.trim(),
              city: dto.shippingAddress.city.trim(),
              state: dto.shippingAddress.state.trim(),
              postalCode: dto.shippingAddress.postalCode.trim(),
              country: dto.shippingAddress.country?.trim() || 'India',
            },
            items: lines.map((line) => ({
              productId: line.product.id,
              slug: line.product.slug,
              name: line.product.name,
              price: Number(line.product.price),
              quantity: line.quantity,
              color: line.color,
              size: line.size,
              image: line.product.image,
            })),
            bundle_items: bundleValidation.bundles.map((b) => ({
              bundleId: b.bundle.id,
              bundleName: b.bundle.name,
              quantity: b.price.quantity,
              selectedItems: b.selectedItems,
              originalTotal: b.price.originalTotal,
              discountTotal: b.price.discountTotal,
              finalTotal: b.price.finalTotal,
            })),
            subtotal,
            discount,
            promoCode: promoCode ?? null,
            shippingFee,
            deliverySurcharge,
            tax,
            total,
            deliveryOption: isExpress ? 'express' : 'standard',
            notes: dto.notes?.trim() || '',
            status: 'Confirmed',
            statusHistory: [{ status: 'Confirmed', note: 'Order placed', at: now.toISOString() }],
            payment: {
              method: paymentMethod,
              status: 'pending',
              ...(paymentMethod === 'cod'
                ? { transactionId: `COD-${crypto.randomInt(100_000_000, 1_000_000_000)}` }
                : {}),
            },
            carrier: carrierName,
            selected_shipping_method_id: dto.selectedShippingMethodId || null,
            shipping_provider_code: dto.shippingProvider || dto.shippingProviderCode || (validatedQuote ? validatedQuote.provider : null),
            shipping_provider: dto.shippingProvider || dto.shippingProviderCode || (validatedQuote ? validatedQuote.provider : null),
            shipping_quote_token: dto.shippingQuoteToken || null,
            shipping_cost: shippingFee,
            shipping_status: 'pending',
            estimatedDeliveryDate,
            inventory_reservation_token: dto.reservationToken || null,
          })
          .select()
          .single(),
      );
      order = toDoc(row);
    } catch (err) {
      await this.releaseStock(reserved);
      throw err;
    }

    unwrap(
      await this.db.from('payments').insert({
        order: order.id,
        orderId: order.orderId,
        user: order.user ?? null,
        amount: order.total,
        currency: commerce.currency,
        method: paymentMethod,
        status: 'pending',
        transactionId: order.payment.transactionId ?? null,
      }),
    );

    if (promoCode) {
      await this.discountsService.incrementUsage(promoCode);
    }

    if (userId) {
      unwrap(await this.db.from('carts').update({ items: [], bundle_items: [] }).eq('user', userId.toString()));
    }

    // Record server-side analytics purchase event (fire-and-forget)
    void this.analyticsService
      .recordEvent({
        eventType: 'purchase',
        userId: userId ? userId.toString() : undefined,
        orderId: order.id,
        value: Number(order.total || 0),
        city: order.shippingAddress?.city,
        state: order.shippingAddress?.state,
        country: order.shippingAddress?.country,
        source: 'web_storefront',
      })
      .catch((err: any) => console.warn(`Purchase analytics event failed: ${err?.message}`));

    // Award loyalty points after confirmed order (fire-and-forget, idempotent)
    if (userId && order.status !== 'Cancelled') {
      const shouldAward =
        paymentMethod === 'cod' ||
        order.payment?.status === 'paid';

      if (shouldAward) {
        void this.loyaltyService
          .awardPurchasePoints({
            userId: userId.toString(),
            orderId: order.id,
            orderTotal: Number(order.total || 0),
          })
          .catch((err) => console.warn(`Loyalty award failed: ${err?.message}`));

        void this.loyaltyService
          .qualifyReferralFromOrder({
            userId: userId.toString(),
            orderId: order.id,
            orderTotal: Number(order.total || 0),
          })
          .catch(() => null);
      }
    }

    // Auto-create shipment if enabled or store pickup / COD confirmed
    const chosenProvider = (dto.shippingProvider || dto.shippingProviderCode || (validatedQuote ? validatedQuote.provider : null)) as any;
    const shippingSettings = typeof this.shippingService?.getSettings === 'function'
      ? await this.shippingService.getSettings().catch(() => null)
      : null;
    if (
      shippingSettings?.autoCreateShipments ||
      paymentMethod === 'cod' ||
      chosenProvider === 'store_pickup'
    ) {
      void this.shippingService
        .createShipment({
          orderId: order.id,
          provider: chosenProvider || shippingSettings?.defaultProvider,
          serviceCode: validatedQuote?.service_code || validatedQuote?.serviceCode,
        })
        .catch((err) => console.warn(`Shipment creation failed: ${err?.message}`));
    }

    // Commit inventory reservation after successful order creation (fire-and-forget, idempotent)
    if (dto.reservationToken) {
      void this.inventoryService
        .commitReservation(dto.reservationToken, { orderId: order.id })
        .catch((err) => console.warn(`Inventory commit failed: ${err?.message}`));
    }

    return order;
  }

  async getMyOrders(userId: string): Promise<OrderDocument[]> {
    return toDocs(
      unwrap(
        await this.db.from('orders').select('*').eq('user', userId.toString()).order('createdAt', { ascending: false }),
      ),
    );
  }

  private async findByIdentifier(identifier: string): Promise<OrderDocument | null> {
    const trimmed = (identifier || '').trim();
    if (!trimmed) return null;
    const byOrderId = `orderId.ilike.${quoteFilterValue(escapeLike(trimmed))}`;
    const row = unwrap(
      await this.db
        .from('orders')
        .select('*')
        .or(isUuid(trimmed) ? `${byOrderId},id.eq.${trimmed}` : byOrderId)
        .limit(1)
        .maybeSingle(),
    );
    return row ? toDoc(row) : null;
  }

  /** Order details are only visible to the owner, an admin, or someone who knows the order email. */
  async getOrderForViewer(orderId: string, viewer?: UserDocument, email?: string): Promise<OrderDocument> {
    const order = await this.findByIdentifier(orderId);
    const notFound = new NotFoundException(`Order '${orderId}' was not found.`);
    if (!order) throw notFound;

    const isOwner = Boolean(viewer && order.user && order.user === viewer.id);
    const isAdmin = viewer ? ADMIN_ROLES.includes(String(viewer.role || '').toLowerCase().trim()) : false;
    const emailMatches = Boolean(email && order.customer?.email === email.toLowerCase().trim());

    if (!isOwner && !isAdmin && !emailMatches) throw notFound;
    return order;
  }

  async trackOrder(orderNumber: string, email: string): Promise<OrderDocument> {
    const trimmedOrder = (orderNumber || '').trim();
    const trimmedEmail = (email || '').toLowerCase().trim();

    if (!trimmedOrder || !trimmedEmail) {
      throw new BadRequestException('Order number and customer email address are both required.');
    }

    const row = unwrap(
      await this.db
        .from('orders')
        .select('*')
        .eq('customer->>email', trimmedEmail)
        .or(
          `orderId.ilike.${quoteFilterValue(escapeLike(trimmedOrder))},orderId.ilike.${quoteFilterValue(escapeLike(`LST-${trimmedOrder}`))}`,
        )
        .limit(1)
        .maybeSingle(),
    );

    if (!row) {
      throw new NotFoundException('No order found matching the provided order number and email address.');
    }

    return toDoc(row);
  }
}
