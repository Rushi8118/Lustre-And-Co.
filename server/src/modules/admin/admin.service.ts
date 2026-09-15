import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import slugify from 'slugify';
import * as bcrypt from 'bcryptjs';
import { SupabaseService } from '../../database/supabase.service.js';
import { USER_PUBLIC_COLUMNS, type UserDocument } from '../users/schemas/user.schema.js';
import type { OrderDocument } from '../orders/schemas/order.schema.js';
import { SettingsService } from '../settings/settings.service.js';
import { AdminCreateProductDto } from './dto/create-product.dto.js';
import { AdminUpdateProductDto } from './dto/update-product.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { AdminCreateDiscountDto } from './dto/create-discount.dto.js';
import { AdminUpdateDiscountDto } from './dto/update-discount.dto.js';
import { AdminFilterOrdersDto } from './dto/filter-orders.dto.js';
import {
  AdminCreateUserDto,
  AdminFilterCustomersDto,
  AdminFilterPaymentsDto,
  AdminUpdateUserDto,
} from './dto/customer.dto.js';
import {
  containsAny,
  countOf,
  escapeLike,
  fetchAll,
  idOrColumn,
  isUuid,
  quoteFilterValue,
  toDoc,
  toDocs,
  unwrap,
} from '../../common/utils/db.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const toSlug = (value: string) =>
  ((slugify as any).default || slugify)(value, { lower: true, strict: true }) as string;

/** Percentage change vs. the previous period; null when there is no baseline to compare with. */
const percentChange = (current: number, previous: number) =>
  previous > 0 ? Number((((current - previous) / previous) * 100).toFixed(1)) : null;

const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

@Injectable()
export class AdminService {
  constructor(
    @Inject(SupabaseService) private readonly db: SupabaseService,
    @Inject(SettingsService) private readonly settingsService: SettingsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------------

  async getDashboardMetrics(days = 7) {
    const db = this.db;
    const now = new Date();
    const periodStart = startOfDay(new Date(now.getTime() - (days - 1) * DAY_MS));
    const previousStart = new Date(periodStart.getTime() - days * DAY_MS);
    const periodIso = periodStart.toISOString();
    const previousIso = previousStart.toISOString();
    const { lowStockThreshold } = await this.settingsService.getCommerce();
    const customers = () => db.from('users').select('id', { count: 'exact', head: true }).eq('role', 'customer');

    const [
      periodOrders,
      previousOrders,
      totalCustomers,
      newCustomers,
      previousNewCustomers,
      totalProducts,
      lowStockProducts,
      recentOrdersRaw,
      pendingReviews,
      newMessages,
      openOrders,
      lifetimeRows,
    ] = await Promise.all([
      fetchAll<any>(() =>
        db.from('orders').select('total, createdAt').neq('status', 'Cancelled').gte('createdAt', periodIso).order('createdAt'),
      ),
      fetchAll<any>(() =>
        db
          .from('orders')
          .select('total')
          .neq('status', 'Cancelled')
          .gte('createdAt', previousIso)
          .lt('createdAt', periodIso)
          .order('createdAt'),
      ),
      countOf(customers()),
      countOf(customers().gte('createdAt', periodIso)),
      countOf(customers().gte('createdAt', previousIso).lt('createdAt', periodIso)),
      countOf(db.from('products').select('id', { count: 'exact', head: true })),
      db.from('products').select('*').lte('stockQuantity', lowStockThreshold).order('stockQuantity').limit(6).then(unwrap),
      db.from('orders').select('*').order('createdAt', { ascending: false }).limit(6).then(unwrap),
      countOf(db.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending')),
      countOf(db.from('contact_messages').select('id', { count: 'exact', head: true }).eq('status', 'new')),
      countOf(db.from('orders').select('id', { count: 'exact', head: true }).in('status', ['Confirmed', 'Processing'])),
      db.rpc<any[]>('lifetime_order_totals'),
    ]);

    const lifetime = lifetimeRows?.[0];
    const revenue = periodOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const previousRevenue = previousOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const orderCount = periodOrders.length;

    // Daily buckets up to 30 days, weekly buckets for 90 days.
    const bucketDays = days <= 30 ? 1 : 7;
    const bucketCount = Math.ceil(days / bucketDays);
    const buckets = Array.from({ length: bucketCount }, (_, i) => {
      const start = new Date(periodStart.getTime() + i * bucketDays * DAY_MS);
      return {
        start,
        label:
          days === 7
            ? start.toLocaleDateString('en-US', { weekday: 'short' })
            : start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        amount: 0,
        orders: 0,
      };
    });
    for (const order of periodOrders) {
      const index = Math.floor(
        (new Date(order.createdAt).getTime() - periodStart.getTime()) / (bucketDays * DAY_MS),
      );
      if (buckets[index]) {
        buckets[index].amount += Number(order.total || 0);
        buckets[index].orders += 1;
      }
    }

    return {
      period: { days, start: periodStart, end: now },
      metrics: {
        revenue,
        revenueChange: percentChange(revenue, previousRevenue),
        orders: orderCount,
        ordersChange: percentChange(orderCount, previousOrders.length),
        averageOrderValue: orderCount ? Math.round(revenue / orderCount) : 0,
        totalCustomers,
        newCustomers,
        newCustomersChange: percentChange(newCustomers, previousNewCustomers),
        totalProducts,
        lifetimeRevenue: Number(lifetime?.revenue || 0),
        lifetimeOrders: Number(lifetime?.orders || 0),
      },
      attention: {
        pendingReviews,
        newMessages,
        openOrders,
        lowStock: (lowStockProducts || []).length,
      },
      lowStockAlerts: (lowStockProducts || []).map((p: any) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        sku: p.sku,
        stock: p.stockQuantity,
        image: p.image,
        status: p.stockQuantity === 0 ? 'Out of stock' : 'Low stock',
      })),
      recentOrders: (recentOrdersRaw || []).map((o: any) => ({
        id: o.orderId,
        customer: o.customer?.fullName || 'Guest',
        email: o.customer?.email || '',
        createdAt: o.createdAt,
        amount: o.total,
        payment: o.payment?.status || 'pending',
        paymentMethod: o.payment?.method,
        status: o.status,
      })),
      salesTrend: buckets.map(({ label, amount, orders }) => ({ label, amount, orders })),
    };
  }

  // ---------------------------------------------------------------------------
  // Products
  // ---------------------------------------------------------------------------

  async getProducts(search?: string, category?: string, status?: string) {
    let query = this.db.from('products').select('*');
    if (category && category !== 'all') query = query.eq('category', category);
    if (status === 'active') query = query.eq('isActive', true);
    if (status === 'hidden') query = query.eq('isActive', false);
    if (search?.trim()) query = query.or(containsAny(['name', 'sku', 'slug'], search));
    return toDocs(unwrap(await query.order('createdAt', { ascending: false })));
  }

  async getProduct(id: string) {
    const product = unwrap(
      await this.db.from('products').select('*').or(idOrColumn(id, 'slug')).limit(1).maybeSingle(),
    );
    if (!product) throw new NotFoundException(`Product '${id}' was not found.`);
    return toDoc(product);
  }

  private async assertCategoryExists(slug: string) {
    const count = await countOf(this.db.from('categories').select('id', { count: 'exact', head: true }).eq('slug', slug));
    if (!count) {
      throw new BadRequestException(`Category '${slug}' does not exist. Create it under Categories first.`);
    }
  }

  private async slugTaken(slug: string) {
    return (await countOf(this.db.from('products').select('id', { count: 'exact', head: true }).eq('slug', slug))) > 0;
  }

  async createProduct(dto: AdminCreateProductDto) {
    const category = dto.category.toLowerCase().trim();
    await this.assertCategoryExists(category);

    const baseSlug = toSlug(dto.name);
    let slug = baseSlug;
    for (let n = 2; await this.slugTaken(slug); n++) {
      slug = `${baseSlug}-${n}`;
    }

    const { oldPrice, badge, ...rest } = dto;
    const product = unwrap(
      await this.db
        .from('products')
        .insert({
          ...rest,
          category,
          slug,
          sku: dto.sku?.trim() || `LC-${category.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-5)}`,
          oldPrice: oldPrice ?? null,
          badge: badge?.trim() || null,
          availability: dto.stockQuantity > 0 ? 'in-stock' : 'out-of-stock',
          rating: 0,
          reviews: 0,
          salesCount: 0,
          gallery: dto.gallery?.length ? dto.gallery : [dto.image],
          availableColors: dto.availableColors?.length ? dto.availableColors : ['Gold'],
          availableSizes: dto.availableSizes?.length ? dto.availableSizes : ['Standard'],
        })
        .select()
        .single(),
    );

    return toDoc(product);
  }

  async updateProduct(id: string, dto: AdminUpdateProductDto) {
    const product = await this.getProduct(id);

    if (dto.category) {
      dto.category = dto.category.toLowerCase().trim();
      await this.assertCategoryExists(dto.category);
    }

    const { oldPrice, badge, ...rest } = dto;
    const patch: Record<string, any> = { ...rest };

    if (oldPrice === null) patch.oldPrice = null;
    else if (oldPrice !== undefined) patch.oldPrice = oldPrice;

    if (badge !== undefined) patch.badge = badge.trim() || null;

    if (dto.stockQuantity !== undefined && dto.availability === undefined) {
      patch.availability = dto.stockQuantity > 0 ? 'in-stock' : 'out-of-stock';
    }

    const updated = unwrap(await this.db.from('products').update(patch).eq('id', product.id).select().single());
    return toDoc(updated);
  }

  async deleteProduct(id: string) {
    const product = await this.getProduct(id);

    // Reviews cascade with the product row; bags and wishlists are cleaned up first.
    await this.db.rpc('purge_product_references', { p_id: product.id });
    unwrap(await this.db.from('products').delete().eq('id', product.id));

    return {
      success: true,
      message: `Product '${product.name}' was removed from the catalog. Past orders keep their snapshot.`,
      productId: product.id,
    };
  }

  // ---------------------------------------------------------------------------
  // Orders
  // ---------------------------------------------------------------------------

  async getOrders(dto: AdminFilterOrdersDto) {
    const page = Math.max(1, Number(dto.page || 1));
    const limit = Math.min(200, Math.max(1, Number(dto.limit || 50)));

    let query = this.db.from('orders').select('*', { count: 'exact' });
    if (dto.status && !['all', 'all statuses'].includes(dto.status.toLowerCase())) {
      query =
        dto.status.toLowerCase() === 'shipped'
          ? query.eq('status', 'In Transit')
          : query.ilike('status', escapeLike(dto.status));
    }
    if (dto.paymentStatus && dto.paymentStatus !== 'all') {
      query = query.eq('payment->>status', dto.paymentStatus);
    }
    if (dto.search?.trim()) {
      query = query.or(
        containsAny(['orderId', 'customer->>fullName', 'customer->>email', 'customer->>phone'], dto.search),
      );
    }

    const [result, statusCounts] = await Promise.all([
      query.order('createdAt', { ascending: false }).range((page - 1) * limit, page * limit - 1),
      this.db.rpc<any[]>('count_by', { p_table: 'orders', p_column: 'status' }),
    ]);
    const orders = unwrap(result);
    const total = result.count || 0;

    return {
      orders: toDocs(orders),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      statusCounts: Object.fromEntries((statusCounts || []).map((s) => [s.key, Number(s.count)])),
    };
  }

  private async findOrder(id: string): Promise<OrderDocument> {
    const trimmed = (id || '').trim();
    const byOrderId = `orderId.ilike.${quoteFilterValue(escapeLike(trimmed))}`;
    const order = unwrap(
      await this.db
        .from('orders')
        .select('*')
        .or(isUuid(trimmed) ? `id.eq.${trimmed},${byOrderId}` : byOrderId)
        .limit(1)
        .maybeSingle(),
    );
    if (!order) throw new NotFoundException(`Order '${id}' not found.`);
    return toDoc(order);
  }

  async getOrder(id: string) {
    const order = await this.findOrder(id);
    const payment = unwrap(await this.db.from('payments').select('*').eq('orderId', order.orderId).maybeSingle());
    return { order, payment: toDoc(payment) };
  }

  /** Updates the order's embedded payment in memory and upserts the ledger row. */
  private async setPaymentStatus(order: OrderDocument, status: string) {
    const paidAt = status === 'paid' ? order.payment?.paidAt || new Date().toISOString() : order.payment?.paidAt;
    order.payment = { ...order.payment, status, paidAt };

    const existing = unwrap(await this.db.from('payments').select('id').eq('orderId', order.orderId).maybeSingle());
    if (existing) {
      unwrap(await this.db.from('payments').update({ status, paidAt: paidAt ?? null }).eq('id', existing.id));
    } else {
      unwrap(
        await this.db.from('payments').insert({
          order: order.id,
          orderId: order.orderId,
          user: order.user ?? null,
          amount: order.total,
          method: order.payment?.method || 'cod',
          status,
          paidAt: paidAt ?? null,
        }),
      );
    }
  }

  private async saveOrder(order: OrderDocument, fields: Array<keyof OrderDocument>) {
    const patch = Object.fromEntries(fields.map((field) => [field, order[field] ?? null]));
    return toDoc<any>(unwrap(await this.db.from('orders').update(patch).eq('id', order.id).select().single()));
  }

  async updateOrderStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.findOrder(id);
    const targetStatus = dto.status.trim().toLowerCase() === 'shipped' ? 'In Transit' : dto.status.trim();

    if (order.status === 'Cancelled' && targetStatus !== 'Cancelled') {
      throw new BadRequestException('Cancelled orders cannot be reopened. Ask the customer to place a new order.');
    }

    const statusChanged = order.status !== targetStatus;
    order.status = targetStatus;

    if (dto.trackingNumber !== undefined) order.trackingNumber = dto.trackingNumber.trim();
    if (dto.carrier) order.carrier = dto.carrier.trim();

    // Return stock to inventory once when an order is cancelled.
    if (targetStatus === 'Cancelled' && !order.stockRestored) {
      for (const item of order.items) {
        if (!isUuid(item.productId)) continue;
        await this.db.rpc('release_product_stock', { p_id: item.productId, p_qty: item.quantity });
      }
      order.stockRestored = true;
    }

    // Cash on delivery is collected when the parcel is delivered.
    if (targetStatus === 'Delivered' && order.payment?.method === 'cod' && order.payment.status === 'pending') {
      await this.setPaymentStatus(order, 'paid');
    }

    if (statusChanged || dto.note) {
      order.statusHistory = [
        ...(order.statusHistory || []),
        { status: targetStatus, note: dto.note?.trim() || undefined, at: new Date().toISOString() },
      ];
    }

    const saved = await this.saveOrder(order, [
      'status',
      'trackingNumber',
      'carrier',
      'stockRestored',
      'payment',
      'statusHistory',
    ]);

    return {
      success: true,
      message: `Order ${saved.orderId} is now '${saved.status}'.`,
      order: saved,
    };
  }

  async updatePaymentStatus(id: string, status: string) {
    const order = await this.findOrder(id);
    await this.setPaymentStatus(order, status);
    order.statusHistory = [
      ...(order.statusHistory || []),
      { status: order.status, note: `Payment marked ${status}`, at: new Date().toISOString() },
    ];
    const saved = await this.saveOrder(order, ['payment', 'statusHistory']);
    return { success: true, message: `Payment for ${saved.orderId} marked ${status}.`, order: saved };
  }

  // ---------------------------------------------------------------------------
  // Discounts
  // ---------------------------------------------------------------------------

  private async couponExists(code: string) {
    return (await countOf(this.db.from('coupons').select('id', { count: 'exact', head: true }).eq('code', code))) > 0;
  }

  async createDiscount(dto: AdminCreateDiscountDto) {
    const code = dto.code.trim().toUpperCase();
    if (await this.couponExists(code)) {
      throw new ConflictException(`Coupon code '${code}' already exists.`);
    }

    const coupon = unwrap(
      await this.db
        .from('coupons')
        .insert({
          ...dto,
          code,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt).toISOString() : null,
        })
        .select()
        .single(),
    );
    return toDoc(coupon);
  }

  async getDiscounts() {
    return toDocs(unwrap(await this.db.from('coupons').select('*').order('createdAt', { ascending: false })));
  }

  private async findCoupon(id: string) {
    const coupon = unwrap(
      await this.db
        .from('coupons')
        .select('*')
        .or(idOrColumn(id, 'code', (id || '').trim().toUpperCase()))
        .limit(1)
        .maybeSingle(),
    );
    if (!coupon) throw new NotFoundException(`Coupon '${id}' not found.`);
    return coupon;
  }

  async updateDiscount(id: string, dto: AdminUpdateDiscountDto) {
    const coupon = await this.findCoupon(id);

    const { expiresAt, code, ...rest } = dto;
    const patch: Record<string, any> = { ...rest };
    if (code && code.toUpperCase() !== coupon.code) {
      if (await this.couponExists(code.toUpperCase())) {
        throw new ConflictException(`Coupon code '${code.toUpperCase()}' already exists.`);
      }
      patch.code = code.toUpperCase();
    }
    if (expiresAt === null || expiresAt === '') patch.expiresAt = null;
    else if (expiresAt) patch.expiresAt = new Date(expiresAt).toISOString();

    return toDoc(unwrap(await this.db.from('coupons').update(patch).eq('id', coupon.id).select().single()));
  }

  async deleteDiscount(id: string) {
    const coupon = await this.findCoupon(id);
    unwrap(await this.db.from('coupons').delete().eq('id', coupon.id));
    return { success: true, message: `Coupon '${coupon.code}' deleted.` };
  }

  // ---------------------------------------------------------------------------
  // Customers & staff accounts
  // ---------------------------------------------------------------------------

  async getCustomers(dto: AdminFilterCustomersDto) {
    const page = Math.max(1, Number(dto.page || 1));
    const limit = Math.min(200, Math.max(1, Number(dto.limit || 50)));
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    let query = this.db.from('users').select(USER_PUBLIC_COLUMNS, { count: 'exact' });
    if (dto.role && dto.role !== 'all') query = query.eq('role', dto.role);
    if (dto.status === 'active') query = query.eq('isActive', true);
    if (dto.status === 'inactive') query = query.eq('isActive', false);
    if (dto.search?.trim()) query = query.or(containsAny(['name', 'email', 'phone'], dto.search));

    const customers = () => this.db.from('users').select('id', { count: 'exact', head: true }).eq('role', 'customer');

    const [result, orderStats, totalCustomers, newThisMonth, buyerRows] = await Promise.all([
      query.order('createdAt', { ascending: false }).range((page - 1) * limit, page * limit - 1),
      this.db.rpc<any[]>('customer_order_stats'),
      countOf(customers()),
      countOf(customers().gte('createdAt', monthStart)),
      this.db.rpc<any[]>('buyer_summary'),
    ]);
    const users = unwrap(result) as any[];
    const total = result.count || 0;
    const buyerStats = buyerRows?.[0];

    const statsByUser = new Map((orderStats || []).map((s) => [s.user_id, s]));

    return {
      customers: users.map((u) => {
        const stats: any = statsByUser.get(u.id);
        return {
          ...toDoc(u),
          wishlistCount: u.wishlist?.length || 0,
          wishlist: undefined,
          orders: Number(stats?.orders || 0),
          spent: Number(stats?.spent || 0),
          lastOrderAt: stats?.lastOrderAt || null,
        };
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      summary: {
        totalCustomers,
        newThisMonth,
        returningRate: Number(buyerStats?.buyers)
          ? Math.round((Number(buyerStats.returning) / Number(buyerStats.buyers)) * 100)
          : 0,
        averageOrderValue: Number(buyerStats?.orders)
          ? Math.round(Number(buyerStats.revenue) / Number(buyerStats.orders))
          : 0,
      },
    };
  }

  async getCustomer(id: string) {
    if (!isUuid(id)) throw new NotFoundException('Customer not found.');
    const user: any = unwrap(await this.db.from('users').select(USER_PUBLIC_COLUMNS).eq('id', id).maybeSingle());
    if (!user) throw new NotFoundException('Customer not found.');

    const [wishlistProducts, orders] = await Promise.all([
      user.wishlist?.length
        ? this.db.from('products').select('id, name, slug, image, price').in('id', user.wishlist).then(unwrap)
        : Promise.resolve([]),
      this.db
        .from('orders')
        .select('*')
        .or(`user.eq.${user.id},customer->>email.eq.${quoteFilterValue(user.email)}`)
        .order('createdAt', { ascending: false })
        .limit(100)
        .then(unwrap),
    ]);

    const productsById = new Map((wishlistProducts || []).map((p: any) => [p.id, toDoc(p)]));
    return {
      user: {
        ...toDoc(user),
        wishlist: user.wishlist.map((productId: string) => productsById.get(productId)).filter(Boolean),
      },
      orders: toDocs(orders),
    };
  }

  async createUser(dto: AdminCreateUserDto) {
    const email = dto.email.toLowerCase().trim();
    if (await countOf(this.db.from('users').select('id', { count: 'exact', head: true }).eq('email', email))) {
      throw new ConflictException('An account with this email address already exists.');
    }

    const user = unwrap(
      await this.db
        .from('users')
        .insert({
          name: dto.name.trim(),
          email,
          phone: dto.phone?.trim(),
          role: dto.role || 'customer',
          password: await bcrypt.hash(dto.password, 10),
        })
        .select(USER_PUBLIC_COLUMNS)
        .single(),
    );
    return toDoc(user);
  }

  private async findUser(id: string): Promise<UserDocument> {
    if (!isUuid(id)) throw new NotFoundException('Customer not found.');
    const user = unwrap(await this.db.from('users').select('*').eq('id', id).maybeSingle());
    if (!user) throw new NotFoundException('Customer not found.');
    return toDoc(user);
  }

  private async assertNotLastAdmin(user: UserDocument) {
    if (user.role !== 'admin') return;
    const otherAdmins = await countOf(
      this.db
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('isActive', true)
        .neq('id', user.id),
    );
    if (otherAdmins === 0) {
      throw new BadRequestException('At least one active administrator account must remain.');
    }
  }

  async updateUser(id: string, dto: AdminUpdateUserDto, actingAdminId: string) {
    const user = await this.findUser(id);

    const isSelf = user.id === actingAdminId.toString();
    const demoting = dto.role === 'customer' && user.role === 'admin';
    const deactivating = dto.isActive === false && user.isActive !== false;

    if (isSelf && (demoting || deactivating)) {
      throw new BadRequestException('You cannot remove your own admin access or deactivate your own account.');
    }
    if (demoting || deactivating) {
      await this.assertNotLastAdmin(user);
    }

    const patch: Record<string, any> = {};
    if (dto.name !== undefined) patch.name = dto.name.trim();
    if (dto.phone !== undefined) patch.phone = dto.phone.trim();
    if (dto.role !== undefined) patch.role = dto.role;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;
    if (dto.password) patch.password = await bcrypt.hash(dto.password, 10);

    const updated = unwrap(
      await this.db.from('users').update(patch).eq('id', user.id).select(USER_PUBLIC_COLUMNS).single(),
    );
    return toDoc(updated);
  }

  async deleteUser(id: string, actingAdminId: string) {
    const user = await this.findUser(id);

    if (user.id === actingAdminId.toString()) {
      throw new BadRequestException('You cannot delete your own account.');
    }
    await this.assertNotLastAdmin(user);

    // The bag cascades with the user; orders keep their snapshot with user set to null.
    unwrap(await this.db.from('users').delete().eq('id', user.id));
    return {
      success: true,
      message: `Account '${user.email}' deleted. Their past orders are kept for your records.`,
    };
  }

  // ---------------------------------------------------------------------------
  // Payments ledger
  // ---------------------------------------------------------------------------

  async getPayments(dto: AdminFilterPaymentsDto) {
    let query = this.db.from('payments').select('*');
    if (dto.status && dto.status !== 'all') query = query.eq('status', dto.status);
    if (dto.search?.trim()) {
      query = query.or(containsAny(['orderId', 'transactionId', 'razorpayPaymentId'], dto.search));
    }

    const [payments, summary] = await Promise.all([
      query.order('createdAt', { ascending: false }).limit(500).then(unwrap),
      this.db.rpc<any[]>('count_by', { p_table: 'payments', p_column: 'status', p_sum: 'amount' }),
    ]);

    return {
      payments: toDocs(payments),
      summary: Object.fromEntries(
        (summary || []).map((s) => [s.key, { count: Number(s.count), amount: Number(s.amount) }]),
      ),
    };
  }
}
