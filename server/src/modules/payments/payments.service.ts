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
import { CancelPaymentDto } from './dto/cancel-payment.dto.js';
import { MockCompletePaymentDto } from './dto/mock-complete-payment.dto.js';
import { getRazorpayCredentials } from '../../common/utils/payments.js';
import { assertMockPaymentAllowed, isMockPaymentMode } from '../../common/utils/payment-mode.js';
import { SupabaseService } from '../../database/supabase.service.js';
import { escapeLike, toDoc, unwrap } from '../../common/utils/db.js';
import { ShippingService } from '../shipping/shipping.service.js';
import { PaymentEvent, PaymentStatus, nextPaymentStatus } from './payment-state.js';

interface AppliedEvent {
  status: PaymentStatus;
  /** True when the event repeated a state already reached (e.g. a retried webhook); nothing was written. */
  duplicate: boolean;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly razorpay: any;
  private readonly credentials: ReturnType<typeof getRazorpayCredentials>;
  private readonly mockMode: boolean;

  constructor(
    @Inject(SupabaseService) private readonly db: SupabaseService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(ShippingService) private readonly shippingService: ShippingService,
  ) {
    assertMockPaymentAllowed();
    this.mockMode = isMockPaymentMode();
    this.credentials = getRazorpayCredentials(this.configService);

    if (this.mockMode) {
      this.logger.warn('MOCK payment mode is ON: no money moves and Razorpay is never called. Development only.');
    } else if (this.credentials.configured) {
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
      enabled: this.mockMode || this.credentials.configured,
      mode: this.mockMode ? 'mock' : 'razorpay',
      // Only the public key id is ever returned; the secret never leaves the server.
      keyId: !this.mockMode && this.credentials.configured ? this.credentials.keyId : null,
      currency: 'INR',
    };
  }

  private ensureConfigured() {
    if (!this.mockMode && !this.credentials.configured) {
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

  private async findOnlineOrder(orderId: string): Promise<OrderDocument> {
    const order = await this.findOrder(orderId);
    if (order.payment?.method !== 'razorpay') {
      throw new BadRequestException('This order was not placed with online payment.');
    }
    return order;
  }

  async createPaymentIntent(dto: CreatePaymentIntentDto) {
    this.ensureConfigured();
    const order = await this.findOnlineOrder(dto.orderId);

    if (order.payment?.status === 'paid') {
      throw new BadRequestException(`Order '${order.orderId}' has already been paid.`);
    }
    if (order.status === 'Cancelled') {
      throw new BadRequestException('This order has been cancelled.');
    }

    const amountInPaise = Math.round(Number(order.total) * 100);
    const currency = dto.currency || 'INR';

    let razorpayOrderId: string;
    if (this.mockMode) {
      razorpayOrderId = `order_mock_${crypto.randomBytes(8).toString('hex')}`;
    } else {
      try {
        const rzpOrder = await this.razorpay.orders.create({
          amount: amountInPaise,
          currency,
          receipt: order.orderId,
          notes: { orderId: order.orderId },
        });
        razorpayOrderId = rzpOrder.id;
      } catch (err: any) {
        this.logger.error(`Razorpay order creation failed for ${order.orderId}: ${err?.error?.description || err.message}`);
        throw new BadGatewayException('The payment gateway is unavailable. Please try again shortly.');
      }
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
      mode: this.mockMode ? 'mock' : 'razorpay',
      orderId: order.orderId,
      razorpayOrderId,
      amount: amountInPaise,
      currency,
      keyId: this.mockMode ? null : this.credentials.keyId,
    };
  }

  async verifyPayment(dto: VerifyPaymentDto) {
    this.ensureConfigured();
    if (this.mockMode) {
      throw new BadRequestException('Signature verification is not used in mock mode. Use /payments/mock/complete.');
    }
    const order = await this.findOnlineOrder(dto.orderId);

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

    const applied = await this.applyEvent(order, 'captured', 'Payment received', {
      transactionId: dto.razorpayPaymentId,
      razorpayPaymentId: dto.razorpayPaymentId,
      razorpaySignature: dto.razorpaySignature,
    });

    if (!applied.duplicate) {
      await this.createShipmentIfNeeded(order);
    }

    return {
      success: true,
      message: applied.duplicate ? 'Payment was already verified.' : 'Payment verified successfully.',
      orderId: order.orderId,
      paymentStatus: 'paid',
      transactionId: dto.razorpayPaymentId,
      alreadyProcessed: applied.duplicate,
    };
  }

  /** The customer closed the payment window without paying. */
  async cancelPayment(dto: CancelPaymentDto) {
    const order = await this.findOnlineOrder(dto.orderId);
    const applied = await this.applyEvent(order, 'cancelled', 'Customer closed the payment window');
    return { success: true, orderId: order.orderId, paymentStatus: applied.status, alreadyProcessed: applied.duplicate };
  }

  /**
   * Development only: completes a mock payment with a chosen outcome. It runs the same
   * transitions as the real verify and webhook paths, so the rest of the flow is exercised.
   */
  async completeMockPayment(dto: MockCompletePaymentDto) {
    if (!this.mockMode) {
      throw new NotFoundException();
    }
    const order = await this.findOnlineOrder(dto.orderId);

    if (dto.outcome === 'success') {
      const transactionId = `mock_pay_${crypto.randomBytes(6).toString('hex')}`;
      const applied = await this.applyEvent(order, 'captured', 'Mock payment captured', { transactionId });
      if (!applied.duplicate) {
        await this.createShipmentIfNeeded(order);
      }
      return { success: true, orderId: order.orderId, paymentStatus: 'paid', transactionId, alreadyProcessed: applied.duplicate };
    }

    if (dto.outcome === 'failed') {
      const applied = await this.applyEvent(order, 'failed', 'Mock payment declined', { failureReason: 'Mock payment declined' });
      return { success: true, orderId: order.orderId, paymentStatus: applied.status, alreadyProcessed: applied.duplicate };
    }

    const applied = await this.applyEvent(order, 'cancelled', 'Mock payment cancelled by customer');
    return { success: true, orderId: order.orderId, paymentStatus: applied.status, alreadyProcessed: applied.duplicate };
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

  async handleWebhook(payload: any, signature: string, rawBody?: string | Buffer) {
    if (this.mockMode) {
      throw new NotFoundException();
    }
    if (!signature) {
      throw new BadRequestException('Missing Razorpay webhook signature.');
    }

    const secret = this.credentials.webhookSecret || this.credentials.keySecret;
    const content = rawBody
      ? (typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'))
      : JSON.stringify(payload);

    const expected = crypto.createHmac('sha256', secret).update(content).digest('hex');

    const expectedBuf = Buffer.from(expected);
    const receivedBuf = Buffer.from(signature);
    if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
      this.logger.warn('Razorpay webhook signature verification failed.');
      throw new BadRequestException('Invalid webhook signature.');
    }

    const event = payload?.event;
    const paymentEntity = payload?.payload?.payment?.entity;
    const razorpayOrderId = paymentEntity?.order_id;

    if (!razorpayOrderId) {
      return { success: true, processed: false, reason: 'No order ID in entity' };
    }

    const orderRow = unwrap(
      await this.db.from('orders').select('*').contains('payment', { razorpayOrderId }).limit(1).maybeSingle(),
    );

    if (!orderRow) {
      return { success: true, processed: false, reason: 'Order not found for payment' };
    }

    const order = toDoc<any>(orderRow) as OrderDocument;

    try {
      if (event === 'payment.captured' || event === 'order.paid') {
        // Never mark an order paid for a different amount than the server priced.
        const expectedPaise = Math.round(Number(order.total) * 100);
        if (Number(paymentEntity?.amount) !== expectedPaise) {
          this.logger.warn(
            `Webhook amount mismatch for ${order.orderId}: captured ${paymentEntity?.amount}, expected ${expectedPaise}.`,
          );
          return { success: true, event, orderId: order.orderId, processed: false, reason: 'Amount mismatch' };
        }

        const applied = await this.applyEvent(order, 'captured', 'Webhook: Payment captured', {
          transactionId: paymentEntity.id,
          razorpayPaymentId: paymentEntity.id,
        });
        return { success: true, event, orderId: order.orderId, status: applied.status, processed: !applied.duplicate };
      }

      if (event === 'payment.failed') {
        const reason = paymentEntity?.error_description || 'Gateway error';
        const applied = await this.applyEvent(order, 'failed', `Webhook: Payment failed (${reason})`, {
          failureReason: paymentEntity?.error_description || 'Payment failed',
        });
        return { success: true, event, orderId: order.orderId, status: applied.status, processed: !applied.duplicate };
      }
    } catch (err) {
      // A transition the state machine rejects (e.g. a late failure after payment) is acknowledged, not retried.
      if (err instanceof BadRequestException) {
        return { success: true, event, orderId: order.orderId, processed: false, reason: err.message };
      }
      throw err;
    }

    return { success: true, event, processed: true };
  }

  /**
   * The single place where a payment status changes. It validates the transition,
   * writes the order and the payments ledger, and reports whether the event repeated.
   */
  private async applyEvent(
    order: OrderDocument,
    event: PaymentEvent,
    note: string,
    detail: Record<string, unknown> = {},
  ): Promise<AppliedEvent> {
    let transition;
    try {
      transition = nextPaymentStatus(order.payment?.status, event);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'Invalid payment state change.');
    }

    if (transition.duplicate) {
      return { status: transition.status, duplicate: true };
    }

    const at = new Date().toISOString();
    const payment = {
      ...order.payment,
      ...detail,
      status: transition.status,
      ...(transition.status === 'paid' ? { paidAt: at } : {}),
    };

    unwrap(
      await this.db
        .from('orders')
        .update({
          payment,
          statusHistory: [...(order.statusHistory || []), { status: order.status, note, at }],
        })
        .eq('id', order.id),
    );

    const ledger: Record<string, unknown> = { status: transition.status };
    for (const key of ['transactionId', 'razorpayPaymentId', 'razorpaySignature']) {
      if (detail[key] !== undefined) ledger[key] = detail[key];
    }
    if (transition.status === 'paid') ledger.paidAt = at;

    unwrap(await this.db.from('payments').update(ledger).eq('orderId', order.orderId));

    order.payment = payment as OrderDocument['payment'];
    return { status: transition.status, duplicate: false };
  }

  /** Auto-creates a shipment after payment, unless the order was cancelled. Failures are queued for retry. */
  private async createShipmentIfNeeded(order: OrderDocument) {
    if (order.status === 'Cancelled') return;
    try {
      const shippingSettings = await this.shippingService.getSettings();
      if (shippingSettings.autoCreateShipments) {
        await this.shippingService.createShipment({
          orderId: order.id,
          provider: (order.shipping_provider || order.shipping_provider_code) as any,
        });
      }
    } catch (shipmentErr) {
      this.logger.error(
        `Shipment creation failed for paid order ${order.orderId}: ${shipmentErr instanceof Error ? shipmentErr.message : String(shipmentErr)}`,
      );
      await this.db.from('orders').update({ shipping_status: 'pending' }).eq('id', order.id);
    }
  }
}
