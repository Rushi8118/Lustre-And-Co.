import {
  Injectable,
  NotFoundException,
  BadRequestException,
  BadGatewayException,
  Inject,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import type { OrderDocument } from '../orders/schemas/order.schema.js';
import { CreatePaymentIntentDto } from './dto/create-intent.dto.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';
import { CodPaymentDto } from './dto/cod-payment.dto.js';
import { getRazorpayCredentials } from '../../common/utils/payments.js';
import { SupabaseService } from '../../database/supabase.service.js';
import { escapeLike, toDoc, unwrap } from '../../common/utils/db.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly razorpay: any;
  private readonly credentials: ReturnType<typeof getRazorpayCredentials>;

  constructor(
    @Inject(SupabaseService) private readonly db: SupabaseService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    this.credentials = getRazorpayCredentials(this.configService);

    if (this.credentials.configured) {
      this.razorpay = new Razorpay({
        key_id: this.credentials.keyId,
        key_secret: this.credentials.keySecret,
      });
    } else {
      this.logger.warn(
        'Razorpay credentials are not configured; online payments are disabled and checkout offers cash on delivery only.',
      );
    }
  }

  getPublicKey() {
    return {
      enabled: this.credentials.configured,
      keyId: this.credentials.configured ? this.credentials.keyId : null,
      currency: 'INR',
    };
  }

  private ensureConfigured() {
    if (!this.credentials.configured) {
      throw new BadRequestException('Online payments are not configured on this store.');
    }
  }

  private async findOrder(orderId: string): Promise<OrderDocument> {
    const order = unwrap(
      await this.db.from('orders').select('*').ilike('orderId', escapeLike(orderId || '')).limit(1).maybeSingle(),
    );
    if (!order) {
      throw new NotFoundException(`Order '${orderId}' was not found.`);
    }
    return toDoc(order);
  }

  async createPaymentIntent(dto: CreatePaymentIntentDto) {
    this.ensureConfigured();
    const order = await this.findOrder(dto.orderId);

    if (order.payment?.method !== 'razorpay') {
      throw new BadRequestException('This order was not placed with online payment.');
    }
    if (order.payment?.status === 'paid') {
      throw new BadRequestException(`Order '${order.orderId}' has already been paid.`);
    }
    if (order.status === 'Cancelled') {
      throw new BadRequestException('This order has been cancelled.');
    }

    const amountInPaise = Math.round(Number(order.total) * 100);

    let razorpayOrderId: string;
    try {
      const rzpOrder = await this.razorpay.orders.create({
        amount: amountInPaise,
        currency: dto.currency || 'INR',
        receipt: order.orderId,
        notes: { orderId: order.orderId },
      });
      razorpayOrderId = rzpOrder.id;
    } catch (err: any) {
      this.logger.error(`Razorpay order creation failed for ${order.orderId}: ${err?.error?.description || err.message}`);
      throw new BadGatewayException('The payment gateway is unavailable. Please try again shortly.');
    }

    unwrap(
      await this.db
        .from('orders')
        .update({ payment: { ...order.payment, razorpayOrderId } })
        .eq('id', order.id),
    );

    unwrap(
      await this.db
        .from('payments')
        .update({ razorpayOrderId, status: 'pending', method: 'razorpay' })
        .eq('orderId', order.orderId),
    );

    return {
      success: true,
      orderId: order.orderId,
      razorpayOrderId,
      amount: amountInPaise,
      currency: dto.currency || 'INR',
      keyId: this.credentials.keyId,
      customer: {
        name: order.customer?.fullName,
        email: order.customer?.email,
        phone: order.customer?.phone,
      },
    };
  }

  async verifyPayment(dto: VerifyPaymentDto) {
    this.ensureConfigured();
    const order = await this.findOrder(dto.orderId);

    if (order.payment?.razorpayOrderId !== dto.razorpayOrderId) {
      throw new BadRequestException('Payment does not belong to this order.');
    }

    const expected = crypto
      .createHmac('sha256', this.credentials.keySecret)
      .update(`${dto.razorpayOrderId}|${dto.razorpayPaymentId}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expected);
    const receivedBuf = Buffer.from(dto.razorpaySignature);
    if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
      throw new BadRequestException('Payment signature verification failed.');
    }

    const paidAt = new Date().toISOString();
    unwrap(
      await this.db
        .from('orders')
        .update({
          payment: {
            ...order.payment,
            status: 'paid',
            transactionId: dto.razorpayPaymentId,
            razorpayPaymentId: dto.razorpayPaymentId,
            razorpaySignature: dto.razorpaySignature,
            paidAt,
          },
          statusHistory: [...(order.statusHistory || []), { status: order.status, note: 'Payment received', at: paidAt }],
        })
        .eq('id', order.id),
    );

    unwrap(
      await this.db
        .from('payments')
        .update({
          status: 'paid',
          transactionId: dto.razorpayPaymentId,
          razorpayOrderId: dto.razorpayOrderId,
          razorpayPaymentId: dto.razorpayPaymentId,
          razorpaySignature: dto.razorpaySignature,
          paidAt,
        })
        .eq('orderId', order.orderId),
    );

    return {
      success: true,
      message: 'Payment verified successfully.',
      orderId: order.orderId,
      paymentStatus: 'paid',
      transactionId: dto.razorpayPaymentId,
    };
  }

  async confirmCodPayment(dto: CodPaymentDto) {
    const order = await this.findOrder(dto.orderId);

    if (order.payment?.method !== 'cod') {
      throw new BadRequestException('This order was not placed with cash on delivery.');
    }

    return {
      success: true,
      message: 'Cash on Delivery selected. Payment will be collected upon delivery.',
      orderId: order.orderId,
      paymentStatus: order.payment.status,
    };
  }
}
