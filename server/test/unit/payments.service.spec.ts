import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from '../../src/modules/payments/payments.service.js';

describe('PaymentsService (Razorpay Webhook & Signature Verification)', () => {
  let paymentsService: PaymentsService;
  let mockDb: any;
  let mockConfigService: any;
  let mockShippingService: any;

  const TEST_KEY_SECRET = 'live_secret_test_key_1234567890abcdef';

  beforeEach(() => {
    mockDb = {
      from: vi.fn(),
    };
    mockConfigService = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'RAZORPAY_KEY_ID') return 'rzp_live_test123';
        if (key === 'RAZORPAY_KEY_SECRET') return TEST_KEY_SECRET;
        if (key === 'RAZORPAY_WEBHOOK_SECRET') return TEST_KEY_SECRET;
        return null;
      }),
    };
    mockShippingService = {
      createShipment: vi.fn().mockResolvedValue({ id: 'ship-1' }),
    };

    paymentsService = new PaymentsService(mockDb, mockConfigService, mockShippingService);
  });

  // Important test case: Razorpay webhook signatures are verified
  it('should reject webhooks with an invalid cryptographic signature', async () => {
    const payload = {
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_123', order_id: 'order_rzp_123' } } },
    };
    const invalidSignature = 'invalid_tampered_signature_hex';

    await expect(
      paymentsService.handleWebhook(payload, invalidSignature),
    ).rejects.toThrow('Invalid webhook signature.');
  });

  it('should not mark an order paid when the captured amount differs from the order total', async () => {
    const payload = {
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_low_1', order_id: 'order_rzp_low', amount: 100 } } },
    };
    const rawBody = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', TEST_KEY_SECRET).update(rawBody).digest('hex');
    const mockUpdate = vi.fn();

    mockDb.from.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        contains: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'order-uuid-2', orderId: 'LST-777777', total: 500, status: 'Processing', payment: { status: 'pending' } },
              error: null,
            }),
          }),
        }),
      }),
      update: mockUpdate,
    }));

    const result = await paymentsService.handleWebhook(payload, signature, rawBody);
    expect(result.processed).toBe(false);
    expect(result.reason).toBe('Amount mismatch');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  // Important test case: Verified webhook updates order to paid
  it('should accept valid signature and mark order as paid on payment.captured', async () => {
    const payload = {
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_verified_999', order_id: 'order_rzp_999', amount: 50000 } } },
    };
    const rawBody = JSON.stringify(payload);
    const validSignature = crypto
      .createHmac('sha256', TEST_KEY_SECRET)
      .update(rawBody)
      .digest('hex');

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: true, error: null }),
    });

    mockDb.from.mockImplementation((table: string) => {
      if (table === 'orders') {
        return {
          select: vi.fn().mockReturnValue({
            contains: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'order-uuid-1',
                    orderId: 'LST-888888',
                    total: 500,
                    status: 'Processing',
                    payment: { status: 'pending', razorpayOrderId: 'order_rzp_999' },
                  },
                  error: null,
                }),
              }),
            }),
          }),
          update: mockUpdate,
        };
      }
      if (table === 'payments') {
        return { update: mockUpdate };
      }
      return { select: vi.fn() };
    });

    const result = await paymentsService.handleWebhook(payload, validSignature, rawBody);
    expect(result.success).toBe(true);
    expect(result.status).toBe('paid');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        payment: expect.objectContaining({
          status: 'paid',
          transactionId: 'pay_verified_999',
        }),
      }),
    );
  });

  // Important test case: A failed payment does not create a paid order
  it('should mark order payment status as failed and NOT mark order as paid on payment.failed', async () => {
    const payload = {
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_failed_456',
            order_id: 'order_rzp_failed',
            error_description: 'Card declined by issuing bank',
          },
        },
      },
    };
    const rawBody = JSON.stringify(payload);
    const validSignature = crypto
      .createHmac('sha256', TEST_KEY_SECRET)
      .update(rawBody)
      .digest('hex');

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: true, error: null }),
    });

    mockDb.from.mockImplementation((table: string) => {
      if (table === 'orders') {
        return {
          select: vi.fn().mockReturnValue({
            contains: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'order-uuid-failed',
                    orderId: 'LST-FAILED-1',
                    status: 'Processing',
                    payment: { status: 'pending', razorpayOrderId: 'order_rzp_failed' },
                  },
                  error: null,
                }),
              }),
            }),
          }),
          update: mockUpdate,
        };
      }
      return { select: vi.fn() };
    });

    const result = await paymentsService.handleWebhook(payload, validSignature, rawBody);
    expect(result.success).toBe(true);
    expect(result.status).toBe('failed');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        payment: expect.objectContaining({
          status: 'failed',
          failureReason: 'Card declined by issuing bank',
        }),
      }),
    );
  });
});
