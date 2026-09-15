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
import type { UserDocument } from '../users/schemas/user.schema.js';
import { SupabaseService } from '../../database/supabase.service.js';
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
    if (!dto.items || dto.items.length === 0) {
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

    // 1. Price every line from the database (client prices are never trusted).
    const lines: Array<{ product: ProductDocument; quantity: number; color: string; size: string }> = [];
    const requestedByProduct = new Map<string, number>();

    for (const item of dto.items) {
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

    const subtotal = lines.reduce((sum, line) => sum + Number(line.product.price) * line.quantity, 0);

    // 2. Promo code
    let discount = 0;
    let freeShippingCoupon = false;
    let promoCode: string | undefined;
    if (dto.promoCode && dto.promoCode.trim()) {
      const promo = await this.discountsService.validateCoupon(dto.promoCode, subtotal);
      discount = promo.discountAmount || 0;
      freeShippingCoupon = Boolean(promo.freeShipping);
      promoCode = promo.code;
    }

    // 3. Shipping, tax, total — all from admin-managed settings.
    const qualifiesForFreeShipping = subtotal >= commerce.freeShippingThreshold || freeShippingCoupon;
    const shippingFee = qualifiesForFreeShipping ? 0 : commerce.shippingFee;
    const isExpress = dto.deliveryOption === 'express';
    const deliverySurcharge = isExpress ? commerce.expressShippingFee : 0;
    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = Math.round((taxableAmount * commerce.taxPercent) / 100);
    const total = taxableAmount + shippingFee + deliverySurcharge + tax;

    // 4. Reserve stock atomically so two shoppers cannot buy the last unit.
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
    } catch (err) {
      await this.releaseStock(reserved);
      throw err;
    }

    // 5. Persist the order and its payment ledger entry.
    const now = new Date();
    const [startDays, endDays] = isExpress ? [1, 2] : [3, 5];
    const dateOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const estimatedDeliveryDate = `${new Date(now.getTime() + startDays * DAY_MS).toLocaleDateString('en-US', dateOpts)} – ${new Date(now.getTime() + endDays * DAY_MS).toLocaleDateString('en-US', dateOpts)}`;

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
            carrier: 'Bluedart Air Express',
            estimatedDeliveryDate,
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
      unwrap(await this.db.from('carts').update({ items: [] }).eq('user', userId.toString()));
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
    const isAdmin = viewer?.role === 'admin';
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
