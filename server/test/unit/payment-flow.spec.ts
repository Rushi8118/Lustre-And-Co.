import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from '../../src/modules/payments/payments.service.js';
import { InvalidPaymentTransitionError, nextPaymentStatus } from '../../src/modules/payments/payment-state.js';
import { assertMockPaymentAllowed } from '../../src/common/utils/payment-mode.js';

type Row = Record<string, any>;

/**
 * Minimal in-memory stand-in for the Supabase query builder. Supports the chains the
 * payments service uses; awaiting an update applies it to every matching row.
 */
function createFakeDb(tables: Record<string, Row[]>) {
  const query = (table: string, filters: Array<(r: Row) => boolean> = [], patch: Row | null = null): any => {
    const matches = () => (tables[table] || []).filter((r) => filters.every((f) => f(r)));
    return {
      select: () => query(table, filters, patch),
      eq: (col: string, value: unknown) => query(table, [...filters, (r) => r[col] === value], patch),
      ilike: (col: string, pattern: string) => {
        const want = pattern.replace(/\\(.)/g, '$1').toLowerCase();
        return query(table, [...filters, (r) => String(r[col] ?? '').toLowerCase() === want], patch);
      },
      contains: (col: string, value: Row) =>
        query(table, [...filters, (r) => Object.entries(value).every(([k, v]) => r[col]?.[k] === v)], patch),
      limit: () => query(table, filters, patch),
      update: (values: Row) => query(table, filters, values),
      maybeSingle: async () => {
        const row = matches()[0];
        return { data: row ? structuredClone(row) : null, error: null };
      },
      then: (resolve: any, reject: any) => {
        if (patch) matches().forEach((r) => Object.assign(r, structuredClone(patch)));
        return Promise.resolve({ data: null, error: null }).then(resolve, reject);
      },
    };
  };
  return { from: (table: string) => query(table) } as any;
}

const KEY_SECRET = 'test_key_secret_for_unit_tests';

function baseOrder(overrides: Row = {}): Row {
  return {
    id: 'order-uuid-1',
    orderId: 'LST-12345678',
    user: null,
    total: 500,
    status: 'Confirmed',
    statusHistory: [],
    shipping_provider: null,
    shipping_provider_code: null,
    payment: { method: 'razorpay', status: 'pending' },
    ...overrides,
  };
}

function setup({ mock, orderOverrides = {} }: { mock: boolean; orderOverrides?: Row }) {
  process.env.MOCK_PAYMENT_MODE = mock ? 'true' : '';
  const tables = {
    orders: [baseOrder(orderOverrides)],
    payments: [{ orderId: 'LST-12345678', status: 'pending', method: 'razorpay' }],
  };
  const db = createFakeDb(tables);
  const config = {
    get: vi.fn((key: string) => {
      if (key === 'RAZORPAY_KEY_ID') return 'rzp_test_abc123';
      if (key === 'RAZORPAY_KEY_SECRET') return KEY_SECRET;
      return undefined;
    }),
  };
  const shipping = {
    getSettings: vi.fn().mockResolvedValue({ autoCreateShipments: true }),
    createShipment: vi.fn().mockResolvedValue({ id: 'ship-1' }),
  };
  const service = new PaymentsService(db, config as any, shipping as any);
  const order = () => tables.orders[0];
  const ledger = () => tables.payments[0];
  return { service, shipping, order, ledger, tables };
}

afterEach(() => {
  delete process.env.MOCK_PAYMENT_MODE;
});

describe('payment state transitions', () => {
  it('captures a pending payment', () => {
    expect(nextPaymentStatus('pending', 'captured')).toEqual({ status: 'paid', duplicate: false });
  });

  it('captures a payment on retry after an earlier failure', () => {
    expect(nextPaymentStatus('failed', 'captured')).toEqual({ status: 'paid', duplicate: false });
  });

  it('treats a repeated capture as a duplicate, not a new payment', () => {
    expect(nextPaymentStatus('paid', 'captured')).toEqual({ status: 'paid', duplicate: true });
  });

  it('records a failure on a pending payment', () => {
    expect(nextPaymentStatus('pending', 'failed')).toEqual({ status: 'failed', duplicate: false });
  });

  it('records a cancellation on a pending payment', () => {
    expect(nextPaymentStatus('pending', 'cancelled')).toEqual({ status: 'cancelled', duplicate: false });
  });

  it('rejects a late failure after the payment succeeded (invalid)', () => {
    expect(() => nextPaymentStatus('paid', 'failed')).toThrow(InvalidPaymentTransitionError);
  });

  it('rejects cancelling a paid payment (invalid)', () => {
    expect(() => nextPaymentStatus('paid', 'cancelled')).toThrow(InvalidPaymentTransitionError);
  });
});

describe('payment mode guard', () => {
  it('is a no-op when mock mode is off', () => {
    process.env.MOCK_PAYMENT_MODE = '';
    expect(() => assertMockPaymentAllowed()).not.toThrow();
  });

  it('refuses mock mode in production', () => {
    process.env.MOCK_PAYMENT_MODE = 'true';
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(() => assertMockPaymentAllowed()).toThrow(/only allowed when NODE_ENV/);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it('refuses mock mode when NODE_ENV is unset (fails closed)', () => {
    process.env.MOCK_PAYMENT_MODE = 'true';
    const previous = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    try {
      expect(() => assertMockPaymentAllowed()).toThrow(/unset/);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it('allows mock mode in development', () => {
    process.env.MOCK_PAYMENT_MODE = 'true';
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      expect(() => assertMockPaymentAllowed()).not.toThrow();
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});

describe('mock payment mode', () => {
  it('returns a mock intent with no gateway key', async () => {
    const { service } = setup({ mock: true });
    const intent = await service.createPaymentIntent({ orderId: 'LST-12345678' } as any);
    expect(intent.mode).toBe('mock');
    expect(intent.keyId).toBeNull();
    expect(intent.razorpayOrderId).toMatch(/^order_mock_/);
    expect(intent.amount).toBe(50000);
  });

  it('successful payment marks the order and ledger paid and creates one shipment', async () => {
    const { service, order, ledger, shipping } = setup({ mock: true });
    const result = await service.completeMockPayment({ orderId: 'LST-12345678', outcome: 'success' });

    expect(result.paymentStatus).toBe('paid');
    expect(result.alreadyProcessed).toBe(false);
    expect(order().payment.status).toBe('paid');
    expect(order().payment.paidAt).toBeTruthy();
    expect(order().statusHistory).toHaveLength(1);
    expect(ledger().status).toBe('paid');
    expect(shipping.createShipment).toHaveBeenCalledTimes(1);
  });

  it('duplicate success does not re-process or create a second shipment', async () => {
    const { service, order, shipping } = setup({ mock: true });
    await service.completeMockPayment({ orderId: 'LST-12345678', outcome: 'success' });
    const second = await service.completeMockPayment({ orderId: 'LST-12345678', outcome: 'success' });

    expect(second.alreadyProcessed).toBe(true);
    expect(order().statusHistory).toHaveLength(1);
    expect(shipping.createShipment).toHaveBeenCalledTimes(1);
  });

  it('failed payment leaves the order unpaid and creates no shipment', async () => {
    const { service, order, ledger, shipping } = setup({ mock: true });
    const result = await service.completeMockPayment({ orderId: 'LST-12345678', outcome: 'failed' });

    expect(result.paymentStatus).toBe('failed');
    expect(order().payment.status).toBe('failed');
    expect(order().payment.paidAt).toBeUndefined();
    expect(ledger().status).toBe('failed');
    expect(shipping.createShipment).not.toHaveBeenCalled();
  });

  it('customer can retry after a failure and then pay', async () => {
    const { service, order, shipping } = setup({ mock: true });
    await service.completeMockPayment({ orderId: 'LST-12345678', outcome: 'failed' });
    await service.createPaymentIntent({ orderId: 'LST-12345678' } as any);
    const retry = await service.completeMockPayment({ orderId: 'LST-12345678', outcome: 'success' });

    expect(retry.paymentStatus).toBe('paid');
    expect(order().payment.status).toBe('paid');
    expect(shipping.createShipment).toHaveBeenCalledTimes(1);
  });

  it('cancelled payment is recorded as cancelled, not paid', async () => {
    const { service, order } = setup({ mock: true });
    const result = await service.completeMockPayment({ orderId: 'LST-12345678', outcome: 'cancelled' });

    expect(result.paymentStatus).toBe('cancelled');
    expect(order().payment.status).toBe('cancelled');
  });

  it('cancelling after a successful payment is refused (invalid)', async () => {
    const { service, order } = setup({ mock: true });
    await service.completeMockPayment({ orderId: 'LST-12345678', outcome: 'success' });

    await expect(service.cancelPayment({ orderId: 'LST-12345678' } as any)).rejects.toThrow(BadRequestException);
    expect(order().payment.status).toBe('paid');
  });

  it('the customer closing the window records a cancellation', async () => {
    const { service, order } = setup({ mock: true });
    const result = await service.cancelPayment({ orderId: 'LST-12345678' } as any);

    expect(result.paymentStatus).toBe('cancelled');
    expect(order().payment.status).toBe('cancelled');
  });

  it('signature verification is refused in mock mode (invalid request)', async () => {
    const { service } = setup({ mock: true });
    await expect(
      service.verifyPayment({
        orderId: 'LST-12345678',
        razorpayOrderId: 'order_mock_x',
        razorpayPaymentId: 'pay_x',
        razorpaySignature: 'abc',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('webhooks are disabled in mock mode', async () => {
    const { service } = setup({ mock: true });
    await expect(service.handleWebhook({}, 'sig', '{}')).rejects.toThrow(NotFoundException);
  });

  it('mock completion is not reachable when mock mode is off', async () => {
    const { service } = setup({ mock: false });
    await expect(
      service.completeMockPayment({ orderId: 'LST-12345678', outcome: 'success' } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('the public key endpoint never includes a secret', () => {
    const { service } = setup({ mock: true });
    const key = service.getPublicKey();
    expect(key).toEqual({ enabled: true, mode: 'mock', keyId: null, currency: 'INR' });
    expect(JSON.stringify(key)).not.toContain(KEY_SECRET);
  });
});

describe('Razorpay mode (real signature and webhook paths)', () => {
  function signature(orderId: string, paymentId: string) {
    return crypto.createHmac('sha256', KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
  }

  function withRazorpayOrder(orderId: string) {
    return { orderOverrides: { payment: { method: 'razorpay', status: 'pending', razorpayOrderId: orderId } } };
  }

  it('valid signature marks the order paid and creates one shipment', async () => {
    const { service, order, shipping } = setup({ mock: false, ...withRazorpayOrder('order_rzp_1') });
    const result = await service.verifyPayment({
      orderId: 'LST-12345678',
      razorpayOrderId: 'order_rzp_1',
      razorpayPaymentId: 'pay_1',
      razorpaySignature: signature('order_rzp_1', 'pay_1'),
    } as any);

    expect(result.paymentStatus).toBe('paid');
    expect(order().payment.status).toBe('paid');
    expect(shipping.createShipment).toHaveBeenCalledTimes(1);
  });

  it('invalid signature is rejected and writes nothing', async () => {
    const { service, order, shipping } = setup({ mock: false, ...withRazorpayOrder('order_rzp_1') });
    await expect(
      service.verifyPayment({
        orderId: 'LST-12345678',
        razorpayOrderId: 'order_rzp_1',
        razorpayPaymentId: 'pay_1',
        razorpaySignature: 'f'.repeat(64),
      } as any),
    ).rejects.toThrow('Payment signature verification failed.');

    expect(order().payment.status).toBe('pending');
    expect(shipping.createShipment).not.toHaveBeenCalled();
  });

  it('a payment for a different order is rejected', async () => {
    const { service } = setup({ mock: false, ...withRazorpayOrder('order_rzp_1') });
    await expect(
      service.verifyPayment({
        orderId: 'LST-12345678',
        razorpayOrderId: 'order_other',
        razorpayPaymentId: 'pay_1',
        razorpaySignature: signature('order_other', 'pay_1'),
      } as any),
    ).rejects.toThrow('Payment does not belong to this order.');
  });

  it('a repeated verify of a paid order does not ship twice', async () => {
    const { service, shipping } = setup({ mock: false, ...withRazorpayOrder('order_rzp_1') });
    const body = {
      orderId: 'LST-12345678',
      razorpayOrderId: 'order_rzp_1',
      razorpayPaymentId: 'pay_1',
      razorpaySignature: signature('order_rzp_1', 'pay_1'),
    };
    await service.verifyPayment(body as any);
    const again = await service.verifyPayment(body as any);

    expect(again.alreadyProcessed).toBe(true);
    expect(shipping.createShipment).toHaveBeenCalledTimes(1);
  });

  it('webhook failure event does not mark the order paid', async () => {
    const { service, order } = setup({ mock: false, ...withRazorpayOrder('order_rzp_1') });
    const payload = {
      event: 'payment.failed',
      payload: { payment: { entity: { id: 'pay_f', order_id: 'order_rzp_1', error_description: 'Declined' } } },
    };
    const raw = JSON.stringify(payload);
    const sig = crypto.createHmac('sha256', KEY_SECRET).update(raw).digest('hex');
    const result = await service.handleWebhook(payload, sig, raw);

    expect(result.status).toBe('failed');
    expect(order().payment.status).toBe('failed');
  });

  it('a duplicate captured webhook is acknowledged without a second update', async () => {
    const { service, order } = setup({ mock: false, ...withRazorpayOrder('order_rzp_1') });
    const payload = {
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_c', order_id: 'order_rzp_1', amount: 50000 } } },
    };
    const raw = JSON.stringify(payload);
    const sig = crypto.createHmac('sha256', KEY_SECRET).update(raw).digest('hex');

    const first = await service.handleWebhook(payload, sig, raw);
    const second = await service.handleWebhook(payload, sig, raw);

    expect(first.processed).toBe(true);
    expect(second.processed).toBe(false);
    expect(order().statusHistory).toHaveLength(1);
  });

  it('a captured webhook for the wrong amount does not mark the order paid', async () => {
    const { service, order } = setup({ mock: false, ...withRazorpayOrder('order_rzp_1') });
    const payload = {
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_c', order_id: 'order_rzp_1', amount: 100 } } },
    };
    const raw = JSON.stringify(payload);
    const sig = crypto.createHmac('sha256', KEY_SECRET).update(raw).digest('hex');
    const result = await service.handleWebhook(payload, sig, raw);

    expect(result.reason).toBe('Amount mismatch');
    expect(order().payment.status).toBe('pending');
  });

  it('exposes only the public key id', () => {
    const { service } = setup({ mock: false });
    const key = service.getPublicKey();
    expect(key.mode).toBe('razorpay');
    expect(key.keyId).toBe('rzp_test_abc123');
    expect(JSON.stringify(key)).not.toContain(KEY_SECRET);
  });
});
