import {
  Injectable,
  NotFoundException,
  BadRequestException,
  BadGatewayException,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { Order, OrderDocument } from '../orders/schemas/order.schema.js';
import { CreatePaymentIntentDto } from './dto/create-intent.dto.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';
import { CodPaymentDto } from './dto/cod-payment.dto.js';
import { Payment, PaymentDocument } from './schemas/payment.schema.js';
import { getRazorpayCredentials } from '../../common/utils/payments.js';
import { exactMatch } from '../../common/utils/regex.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly razorpay: any;
  private readonly credentials: ReturnType<typeof getRazorpayCredentials>;

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
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

  private async findOrder(orderId: string) {
    const order = await this.orderModel.findOne({ orderId: exactMatch(orderId) }).exec();
    if (!order) {
      throw new NotFoundException(`Order '${orderId}' was not found.`);
    }
    return order;
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

    const amountInPaise = Math.round(order.total * 100);

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

    order.payment = { ...order.payment, razorpayOrderId };
    order.markModified('payment');
    await order.save();

    await this.paymentModel.updateOne(
      { orderId: order.orderId },
      { $set: { razorpayOrderId, status: 'pending', method: 'razorpay' } },
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

    const paidAt = new Date();
    order.payment = {
      ...order.payment,
      status: 'paid',
      transactionId: dto.razorpayPaymentId,
      razorpayPaymentId: dto.razorpayPaymentId,
      razorpaySignature: dto.razorpaySignature,
      paidAt,
    };
    order.statusHistory = [...(order.statusHistory || []), { status: order.status, note: 'Payment received', at: paidAt }];
    order.markModified('payment');
    await order.save();

    await this.paymentModel.updateOne(
      { orderId: order.orderId },
      {
        $set: {
          status: 'paid',
          transactionId: dto.razorpayPaymentId,
          razorpayOrderId: dto.razorpayOrderId,
          razorpayPaymentId: dto.razorpayPaymentId,
          razorpaySignature: dto.razorpaySignature,
          paidAt,
        },
      },
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
