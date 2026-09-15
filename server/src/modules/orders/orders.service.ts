import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import crypto from 'crypto';
import { Order, OrderDocument } from './schemas/order.schema.js';
import { Product, ProductDocument } from '../products/schemas/product.schema.js';
import { Cart, CartDocument } from '../cart/schemas/cart.schema.js';
import { DiscountsService } from '../discounts/discounts.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema.js';
import { SettingsService } from '../settings/settings.service.js';
import type { UserDocument } from '../users/schemas/user.schema.js';
import { exactMatch } from '../../common/utils/regex.js';
import { idOrField } from '../../common/utils/object-id.js';
import { getRazorpayCredentials } from '../../common/utils/payments.js';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    @Inject(DiscountsService) private readonly discountsService: DiscountsService,
    @Inject(SettingsService) private readonly settingsService: SettingsService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  private async generateOrderId(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = `LST-${crypto.randomInt(10_000_000, 100_000_000)}`;
      if (!(await this.orderModel.exists({ orderId: candidate }))) return candidate;
    }
    return `LST-${Date.now()}`;
  }

  private async releaseStock(reserved: Array<{ id: Types.ObjectId; quantity: number }>) {
    for (const line of reserved) {
      await this.productModel
        .updateOne(
          { _id: line.id },
          { $inc: { stockQuantity: line.quantity, salesCount: -line.quantity }, $set: { availability: 'in-stock' } },
        )
        .exec();
    }
  }

  async createOrder(dto: CreateOrderDto, userId?: string | Types.ObjectId) {
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
      const product = await this.productModel
        .findOne({ ...idOrField(item.productId, 'slug'), isActive: { $ne: false } })
        .exec();
      if (!product) {
        throw new BadRequestException(`A product in your bag ('${item.productId}') is no longer available.`);
      }

      const key = product._id.toString();
      const totalRequested = (requestedByProduct.get(key) || 0) + item.quantity;
      requestedByProduct.set(key, totalRequested);

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

    const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);

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
    const reserved: Array<{ id: Types.ObjectId; quantity: number }> = [];
    try {
      for (const line of lines) {
        const result = await this.productModel
          .updateOne(
            { _id: line.product._id, stockQuantity: { $gte: line.quantity } },
            { $inc: { stockQuantity: -line.quantity, salesCount: line.quantity } },
          )
          .exec();
        if (result.modifiedCount === 0) {
          throw new BadRequestException(`"${line.product.name}" just sold out. Please update your bag.`);
        }
        reserved.push({ id: line.product._id as Types.ObjectId, quantity: line.quantity });
      }
      await this.productModel
        .updateMany(
          { _id: { $in: reserved.map((r) => r.id) }, stockQuantity: { $lte: 0 } },
          { $set: { availability: 'out-of-stock' } },
        )
        .exec();
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
      order = await this.orderModel.create({
        orderId: await this.generateOrderId(),
        user: userId ? new Types.ObjectId(userId.toString()) : undefined,
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
          productId: line.product._id.toString(),
          slug: line.product.slug,
          name: line.product.name,
          price: line.product.price,
          quantity: line.quantity,
          color: line.color,
          size: line.size,
          image: line.product.image,
        })),
        subtotal,
        discount,
        promoCode,
        shippingFee,
        deliverySurcharge,
        tax,
        total,
        deliveryOption: isExpress ? 'express' : 'standard',
        notes: dto.notes?.trim() || '',
        status: 'Confirmed',
        statusHistory: [{ status: 'Confirmed', note: 'Order placed', at: now }],
        payment: {
          method: paymentMethod,
          status: 'pending',
          transactionId:
            paymentMethod === 'cod' ? `COD-${crypto.randomInt(100_000_000, 1_000_000_000)}` : undefined,
        },
        carrier: 'Bluedart Air Express',
        estimatedDeliveryDate,
      });
    } catch (err) {
      await this.releaseStock(reserved);
      throw err;
    }

    await this.paymentModel.create({
      order: order._id,
      orderId: order.orderId,
      user: order.user,
      amount: order.total,
      currency: commerce.currency,
      method: paymentMethod,
      status: 'pending',
      transactionId: order.payment.transactionId,
    });

    if (promoCode) {
      await this.discountsService.incrementUsage(promoCode);
    }

    if (userId) {
      await this.cartModel.updateOne(
        { user: new Types.ObjectId(userId.toString()) },
        { $set: { items: [] } },
      );
    }

    return order;
  }

  async getMyOrders(userId: string | Types.ObjectId): Promise<OrderDocument[]> {
    return this.orderModel
      .find({ user: new Types.ObjectId(userId.toString()) })
      .sort({ createdAt: -1 })
      .exec();
  }

  private async findByIdentifier(identifier: string) {
    const trimmed = (identifier || '').trim();
    if (!trimmed) return null;
    const order = await this.orderModel.findOne({ orderId: exactMatch(trimmed) }).exec();
    if (order || !Types.ObjectId.isValid(trimmed)) return order;
    return this.orderModel.findById(trimmed).exec();
  }

  /** Order details are only visible to the owner, an admin, or someone who knows the order email. */
  async getOrderForViewer(orderId: string, viewer?: UserDocument, email?: string): Promise<OrderDocument> {
    const order = await this.findByIdentifier(orderId);
    const notFound = new NotFoundException(`Order '${orderId}' was not found.`);
    if (!order) throw notFound;

    const isOwner = Boolean(viewer && order.user && order.user.toString() === viewer._id.toString());
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

    const order = await this.orderModel
      .findOne({
        'customer.email': trimmedEmail,
        $or: [{ orderId: exactMatch(trimmedOrder) }, { orderId: exactMatch(`LST-${trimmedOrder}`) }],
      })
      .exec();

    if (!order) {
      throw new NotFoundException('No order found matching the provided order number and email address.');
    }

    return order;
  }
}
