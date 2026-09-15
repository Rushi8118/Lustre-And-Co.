import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import slugify from 'slugify';
import * as bcrypt from 'bcryptjs';
import { Product, ProductDocument } from '../products/schemas/product.schema.js';
import { Order, OrderDocument } from '../orders/schemas/order.schema.js';
import { User, UserDocument, PRIVATE_USER_FIELDS } from '../users/schemas/user.schema.js';
import { Coupon, CouponDocument } from '../discounts/schemas/coupon.schema.js';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema.js';
import { Category, CategoryDocument } from '../categories/schemas/category.schema.js';
import { Cart, CartDocument } from '../cart/schemas/cart.schema.js';
import { Review, ReviewDocument } from '../reviews/schemas/review.schema.js';
import {
  ContactMessage,
  ContactMessageDocument,
} from '../engagement/schemas/contact-message.schema.js';
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
import { containsMatch, exactMatch } from '../../common/utils/regex.js';
import { idOrField } from '../../common/utils/object-id.js';

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
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Coupon.name) private readonly couponModel: Model<CouponDocument>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(Review.name) private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(ContactMessage.name)
    private readonly messageModel: Model<ContactMessageDocument>,
    @Inject(SettingsService) private readonly settingsService: SettingsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------------

  async getDashboardMetrics(days = 7) {
    const now = new Date();
    const periodStart = startOfDay(new Date(now.getTime() - (days - 1) * DAY_MS));
    const previousStart = new Date(periodStart.getTime() - days * DAY_MS);
    const notCancelled = { status: { $ne: 'Cancelled' } };
    const { lowStockThreshold } = await this.settingsService.getCommerce();

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
      [lifetime],
    ] = await Promise.all([
      this.orderModel
        .find({ ...notCancelled, createdAt: { $gte: periodStart } })
        .select('total createdAt')
        .lean()
        .exec(),
      this.orderModel
        .find({ ...notCancelled, createdAt: { $gte: previousStart, $lt: periodStart } })
        .select('total')
        .lean()
        .exec(),
      this.userModel.countDocuments({ role: 'customer' }).exec(),
      this.userModel.countDocuments({ role: 'customer', createdAt: { $gte: periodStart } }).exec(),
      this.userModel
        .countDocuments({ role: 'customer', createdAt: { $gte: previousStart, $lt: periodStart } })
        .exec(),
      this.productModel.countDocuments().exec(),
      this.productModel
        .find({ stockQuantity: { $lte: lowStockThreshold } })
        .sort({ stockQuantity: 1 })
        .limit(6)
        .lean()
        .exec(),
      this.orderModel.find().sort({ createdAt: -1 }).limit(6).lean().exec(),
      this.reviewModel.countDocuments({ status: 'pending' }).exec(),
      this.messageModel.countDocuments({ status: 'new' }).exec(),
      this.orderModel.countDocuments({ status: { $in: ['Confirmed', 'Processing'] } }).exec(),
      this.orderModel
        .aggregate([
          { $match: notCancelled },
          { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
        ])
        .exec(),
    ]);

    const revenue = periodOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const previousRevenue = previousOrders.reduce((sum, o) => sum + (o.total || 0), 0);
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
        (new Date((order as any).createdAt).getTime() - periodStart.getTime()) / (bucketDays * DAY_MS),
      );
      if (buckets[index]) {
        buckets[index].amount += order.total || 0;
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
        lifetimeRevenue: lifetime?.revenue || 0,
        lifetimeOrders: lifetime?.orders || 0,
      },
      attention: {
        pendingReviews,
        newMessages,
        openOrders,
        lowStock: lowStockProducts.length,
      },
      lowStockAlerts: lowStockProducts.map((p) => ({
        id: p._id.toString(),
        slug: p.slug,
        name: p.name,
        sku: p.sku,
        stock: p.stockQuantity,
        image: p.image,
        status: p.stockQuantity === 0 ? 'Out of stock' : 'Low stock',
      })),
      recentOrders: recentOrdersRaw.map((o) => ({
        id: o.orderId,
        customer: o.customer?.fullName || 'Guest',
        email: o.customer?.email || '',
        createdAt: (o as any).createdAt,
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
    const filter: Record<string, any> = {};
    if (category && category !== 'all') filter.category = category;
    if (status === 'active') filter.isActive = { $ne: false };
    if (status === 'hidden') filter.isActive = false;
    if (search?.trim()) {
      const rx = containsMatch(search);
      filter.$or = [{ name: rx }, { sku: rx }, { slug: rx }];
    }
    return this.productModel.find(filter).sort({ createdAt: -1 }).lean().exec();
  }

  async getProduct(id: string) {
    const product = await this.productModel.findOne(idOrField(id, 'slug')).exec();
    if (!product) throw new NotFoundException(`Product '${id}' was not found.`);
    return product;
  }

  private async assertCategoryExists(slug: string) {
    if (!(await this.categoryModel.exists({ slug }))) {
      throw new BadRequestException(`Category '${slug}' does not exist. Create it under Categories first.`);
    }
  }

  async createProduct(dto: AdminCreateProductDto) {
    const category = dto.category.toLowerCase().trim();
    await this.assertCategoryExists(category);

    const baseSlug = toSlug(dto.name);
    let slug = baseSlug;
    for (let n = 2; await this.productModel.exists({ slug }); n++) {
      slug = `${baseSlug}-${n}`;
    }

    const { oldPrice, badge, ...rest } = dto;
    const product = await this.productModel.create({
      ...rest,
      category,
      slug,
      sku: dto.sku?.trim() || `LC-${category.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-5)}`,
      oldPrice: oldPrice ?? undefined,
      badge: badge?.trim() || undefined,
      availability: dto.stockQuantity > 0 ? 'in-stock' : 'out-of-stock',
      rating: 0,
      reviews: 0,
      salesCount: 0,
      gallery: dto.gallery?.length ? dto.gallery : [dto.image],
      availableColors: dto.availableColors?.length ? dto.availableColors : ['Gold'],
      availableSizes: dto.availableSizes?.length ? dto.availableSizes : ['Standard'],
    });

    return product;
  }

  async updateProduct(id: string, dto: AdminUpdateProductDto) {
    const product = await this.getProduct(id);

    if (dto.category) {
      dto.category = dto.category.toLowerCase().trim();
      await this.assertCategoryExists(dto.category);
    }

    const { oldPrice, badge, ...rest } = dto;
    Object.assign(product, rest);

    if (oldPrice === null) product.set('oldPrice', undefined);
    else if (oldPrice !== undefined) product.oldPrice = oldPrice;

    if (badge !== undefined) product.set('badge', badge.trim() || undefined);

    if (dto.stockQuantity !== undefined && dto.availability === undefined) {
      product.availability = dto.stockQuantity > 0 ? 'in-stock' : 'out-of-stock';
    }

    await product.save();
    return product;
  }

  async deleteProduct(id: string) {
    const product = await this.getProduct(id);

    await Promise.all([
      product.deleteOne(),
      this.cartModel.updateMany({}, { $pull: { items: { product: product._id } } }).exec(),
      this.userModel.updateMany({}, { $pull: { wishlist: product._id } }).exec(),
      this.reviewModel.deleteMany({ product: product._id }).exec(),
    ]);

    return {
      success: true,
      message: `Product '${product.name}' was removed from the catalog. Past orders keep their snapshot.`,
      productId: product._id.toString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Orders
  // ---------------------------------------------------------------------------

  async getOrders(dto: AdminFilterOrdersDto) {
    const filter: Record<string, any> = {};

    if (dto.status && !['all', 'all statuses'].includes(dto.status.toLowerCase())) {
      filter.status = dto.status.toLowerCase() === 'shipped' ? 'In Transit' : exactMatch(dto.status);
    }
    if (dto.paymentStatus && dto.paymentStatus !== 'all') {
      filter['payment.status'] = dto.paymentStatus;
    }
    if (dto.search?.trim()) {
      const rx = containsMatch(dto.search);
      filter.$or = [
        { orderId: rx },
        { 'customer.fullName': rx },
        { 'customer.email': rx },
        { 'customer.phone': rx },
      ];
    }

    const page = Math.max(1, Number(dto.page || 1));
    const limit = Math.min(200, Math.max(1, Number(dto.limit || 50)));

    const [orders, total, statusCounts] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(filter).exec(),
      this.orderModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).exec(),
    ]);

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      statusCounts: Object.fromEntries(statusCounts.map((s: any) => [s._id, s.count])),
    };
  }

  private async findOrder(id: string) {
    const trimmed = (id || '').trim();
    const order = await this.orderModel
      .findOne(
        Types.ObjectId.isValid(trimmed)
          ? { $or: [{ _id: new Types.ObjectId(trimmed) }, { orderId: exactMatch(trimmed) }] }
          : { orderId: exactMatch(trimmed) },
      )
      .exec();
    if (!order) throw new NotFoundException(`Order '${id}' not found.`);
    return order;
  }

  async getOrder(id: string) {
    const order = await this.findOrder(id);
    const payment = await this.paymentModel.findOne({ orderId: order.orderId }).lean().exec();
    return { order, payment };
  }

  private async setPaymentStatus(order: OrderDocument, status: string) {
    const paidAt = status === 'paid' ? order.payment?.paidAt || new Date() : order.payment?.paidAt;
    order.payment = { ...order.payment, status, paidAt };
    order.markModified('payment');
    await this.paymentModel.updateOne(
      { orderId: order.orderId },
      {
        $set: { status, paidAt },
        $setOnInsert: {
          order: order._id,
          orderId: order.orderId,
          user: order.user,
          amount: order.total,
          method: order.payment?.method || 'cod',
        },
      },
      { upsert: true },
    );
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
        if (!Types.ObjectId.isValid(item.productId)) continue;
        await this.productModel
          .updateOne(
            { _id: new Types.ObjectId(item.productId) },
            {
              $inc: { stockQuantity: item.quantity, salesCount: -item.quantity },
              $set: { availability: 'in-stock' },
            },
          )
          .exec();
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
        { status: targetStatus, note: dto.note?.trim() || undefined, at: new Date() },
      ];
    }

    await order.save();

    return {
      success: true,
      message: `Order ${order.orderId} is now '${order.status}'.`,
      order,
    };
  }

  async updatePaymentStatus(id: string, status: string) {
    const order = await this.findOrder(id);
    await this.setPaymentStatus(order, status);
    order.statusHistory = [
      ...(order.statusHistory || []),
      { status: order.status, note: `Payment marked ${status}`, at: new Date() },
    ];
    await order.save();
    return { success: true, message: `Payment for ${order.orderId} marked ${status}.`, order };
  }

  // ---------------------------------------------------------------------------
  // Discounts
  // ---------------------------------------------------------------------------

  async createDiscount(dto: AdminCreateDiscountDto) {
    const code = dto.code.trim().toUpperCase();
    if (await this.couponModel.exists({ code })) {
      throw new ConflictException(`Coupon code '${code}' already exists.`);
    }

    return this.couponModel.create({
      ...dto,
      code,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
  }

  getDiscounts() {
    return this.couponModel.find().sort({ createdAt: -1 }).exec();
  }

  async updateDiscount(id: string, dto: AdminUpdateDiscountDto) {
    const coupon = await this.couponModel
      .findOne(idOrField(id, 'code', (id || '').trim().toUpperCase()))
      .exec();
    if (!coupon) throw new NotFoundException(`Coupon '${id}' not found.`);

    const { expiresAt, code, ...rest } = dto;
    if (code && code.toUpperCase() !== coupon.code) {
      if (await this.couponModel.exists({ code: code.toUpperCase() })) {
        throw new ConflictException(`Coupon code '${code.toUpperCase()}' already exists.`);
      }
      coupon.code = code.toUpperCase();
    }
    Object.assign(coupon, rest);
    if (expiresAt === null || expiresAt === '') coupon.set('expiresAt', undefined);
    else if (expiresAt) coupon.expiresAt = new Date(expiresAt);

    await coupon.save();
    return coupon;
  }

  async deleteDiscount(id: string) {
    const deleted = await this.couponModel
      .findOneAndDelete(idOrField(id, 'code', (id || '').trim().toUpperCase()))
      .exec();
    if (!deleted) throw new NotFoundException(`Coupon '${id}' not found.`);
    return { success: true, message: `Coupon '${deleted.code}' deleted.` };
  }

  // ---------------------------------------------------------------------------
  // Customers & staff accounts
  // ---------------------------------------------------------------------------

  async getCustomers(dto: AdminFilterCustomersDto) {
    const filter: Record<string, any> = {};
    if (dto.role && dto.role !== 'all') filter.role = dto.role;
    if (dto.status === 'active') filter.isActive = { $ne: false };
    if (dto.status === 'inactive') filter.isActive = false;
    if (dto.search?.trim()) {
      const rx = containsMatch(dto.search);
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
    }

    const page = Math.max(1, Number(dto.page || 1));
    const limit = Math.min(200, Math.max(1, Number(dto.limit || 50)));
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [users, total, orderStats, totalCustomers, newThisMonth, [buyerStats]] = await Promise.all([
      this.userModel
        .find(filter)
        .select(PRIVATE_USER_FIELDS)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.userModel.countDocuments(filter).exec(),
      this.orderModel
        .aggregate([
          { $match: { user: { $ne: null } } },
          {
            $group: {
              _id: '$user',
              orders: { $sum: 1 },
              spent: { $sum: { $cond: [{ $ne: ['$status', 'Cancelled'] }, '$total', 0] } },
              lastOrderAt: { $max: '$createdAt' },
            },
          },
        ])
        .exec(),
      this.userModel.countDocuments({ role: 'customer' }).exec(),
      this.userModel.countDocuments({ role: 'customer', createdAt: { $gte: monthStart } }).exec(),
      this.orderModel
        .aggregate([
          { $match: { user: { $ne: null }, status: { $ne: 'Cancelled' } } },
          { $group: { _id: '$user', orders: { $sum: 1 }, spent: { $sum: '$total' } } },
          {
            $group: {
              _id: null,
              buyers: { $sum: 1 },
              returning: { $sum: { $cond: [{ $gte: ['$orders', 2] }, 1, 0] } },
              revenue: { $sum: '$spent' },
              orders: { $sum: '$orders' },
            },
          },
        ])
        .exec(),
    ]);

    const statsByUser = new Map(orderStats.map((s: any) => [s._id.toString(), s]));

    return {
      customers: users.map((u) => {
        const stats: any = statsByUser.get(u._id.toString());
        return {
          ...u,
          id: u._id,
          wishlistCount: u.wishlist?.length || 0,
          wishlist: undefined,
          orders: stats?.orders || 0,
          spent: stats?.spent || 0,
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
        returningRate: buyerStats?.buyers ? Math.round((buyerStats.returning / buyerStats.buyers) * 100) : 0,
        averageOrderValue: buyerStats?.orders ? Math.round(buyerStats.revenue / buyerStats.orders) : 0,
      },
    };
  }

  async getCustomer(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Customer not found.');
    const user = await this.userModel
      .findById(id)
      .select(PRIVATE_USER_FIELDS)
      .populate('wishlist', 'name slug image price')
      .lean()
      .exec();
    if (!user) throw new NotFoundException('Customer not found.');

    const orders = await this.orderModel
      .find({ $or: [{ user: user._id }, { 'customer.email': user.email }] })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .exec();

    return { user, orders };
  }

  async createUser(dto: AdminCreateUserDto) {
    const email = dto.email.toLowerCase().trim();
    if (await this.userModel.exists({ email })) {
      throw new ConflictException('An account with this email address already exists.');
    }

    const user = await this.userModel.create({
      name: dto.name.trim(),
      email,
      phone: dto.phone?.trim(),
      role: dto.role || 'customer',
      password: await bcrypt.hash(dto.password, 10),
    });

    const { password, ...safe } = user.toObject();
    return safe;
  }

  private async assertNotLastAdmin(user: UserDocument) {
    if (user.role !== 'admin') return;
    const otherAdmins = await this.userModel
      .countDocuments({ role: 'admin', isActive: { $ne: false }, _id: { $ne: user._id } })
      .exec();
    if (otherAdmins === 0) {
      throw new BadRequestException('At least one active administrator account must remain.');
    }
  }

  async updateUser(id: string, dto: AdminUpdateUserDto, actingAdminId: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Customer not found.');
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('Customer not found.');

    const isSelf = user._id.toString() === actingAdminId.toString();
    const demoting = dto.role === 'customer' && user.role === 'admin';
    const deactivating = dto.isActive === false && user.isActive !== false;

    if (isSelf && (demoting || deactivating)) {
      throw new BadRequestException('You cannot remove your own admin access or deactivate your own account.');
    }
    if (demoting || deactivating) {
      await this.assertNotLastAdmin(user);
    }

    if (dto.name !== undefined) user.name = dto.name.trim();
    if (dto.phone !== undefined) user.phone = dto.phone.trim();
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.password) user.password = await bcrypt.hash(dto.password, 10);

    await user.save();
    const { password, resetPasswordTokenHash, resetPasswordExpires, ...safe } = user.toObject();
    return safe;
  }

  async deleteUser(id: string, actingAdminId: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Customer not found.');
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('Customer not found.');

    if (user._id.toString() === actingAdminId.toString()) {
      throw new BadRequestException('You cannot delete your own account.');
    }
    await this.assertNotLastAdmin(user);

    await Promise.all([user.deleteOne(), this.cartModel.deleteOne({ user: user._id }).exec()]);
    return {
      success: true,
      message: `Account '${user.email}' deleted. Their past orders are kept for your records.`,
    };
  }

  // ---------------------------------------------------------------------------
  // Payments ledger
  // ---------------------------------------------------------------------------

  async getPayments(dto: AdminFilterPaymentsDto) {
    const filter: Record<string, any> = {};
    if (dto.status && dto.status !== 'all') filter.status = dto.status;
    if (dto.search?.trim()) {
      const rx = containsMatch(dto.search);
      filter.$or = [{ orderId: rx }, { transactionId: rx }, { razorpayPaymentId: rx }];
    }

    const [payments, summary] = await Promise.all([
      this.paymentModel.find(filter).sort({ createdAt: -1 }).limit(500).lean().exec(),
      this.paymentModel
        .aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }])
        .exec(),
    ]);

    return {
      payments,
      summary: Object.fromEntries(summary.map((s: any) => [s._id, { count: s.count, amount: s.amount }])),
    };
  }
}
