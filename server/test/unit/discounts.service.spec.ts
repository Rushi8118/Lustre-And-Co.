import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { DiscountsService } from '../../src/modules/discounts/discounts.service.js';

describe('DiscountsService (Coupon & Promo Code Rules)', () => {
  let discountsService: DiscountsService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      from: vi.fn(),
      rpc: vi.fn(),
    };
    discountsService = new DiscountsService(mockDb);
  });

  it('should reject empty coupon codes', async () => {
    await expect(discountsService.validateCoupon('')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should reject inactive or non-existent coupon codes', async () => {
    mockDb.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    await expect(discountsService.validateCoupon('NONEXISTENT')).rejects.toThrow(
      'This promo code is invalid or no longer active.',
    );
  });

  // Important test case: Customer cannot apply an expired coupon
  it('should reject expired coupons', async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    mockDb.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              code: 'EXPIRED10',
              isActive: true,
              expiresAt: pastDate,
              value: 0.1,
              type: 'percentage',
            },
            error: null,
          }),
        }),
      }),
    });

    await expect(discountsService.validateCoupon('EXPIRED10', 5000)).rejects.toThrow(
      'Promo code EXPIRED10 has expired.',
    );
  });

  // Test case: Usage limit exhaustion
  it('should reject coupons that reached their usage limit', async () => {
    mockDb.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              code: 'LIMITED50',
              isActive: true,
              usageLimit: 50,
              usedCount: 50,
              value: 0.1,
              type: 'percentage',
            },
            error: null,
          }),
        }),
      }),
    });

    await expect(discountsService.validateCoupon('LIMITED50', 5000)).rejects.toThrow(
      'Promo code LIMITED50 has reached its usage limit.',
    );
  });

  // Test case: Minimum order amount requirement
  it('should reject coupons when subtotal is below minimum order amount', async () => {
    mockDb.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              code: 'BIGSPENDER',
              isActive: true,
              minOrderAmount: 10000,
              value: 0.2,
              type: 'percentage',
            },
            error: null,
          }),
        }),
      }),
    });

    await expect(discountsService.validateCoupon('BIGSPENDER', 4999)).rejects.toThrow(
      'requires a minimum order subtotal',
    );
  });

  // Test case: Valid coupon applies correct discount amount
  it('should calculate percentage discount correctly', async () => {
    mockDb.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              code: 'LUSTRE10',
              isActive: true,
              value: 0.1,
              type: 'percentage',
              minOrderAmount: 1000,
            },
            error: null,
          }),
        }),
      }),
    });

    const result = await discountsService.validateCoupon('LUSTRE10', 8000);
    expect(result.valid).toBe(true);
    expect(result.discountAmount).toBe(800); // 10% of 8000
    expect(result.code).toBe('LUSTRE10');
  });

  it('should calculate fixed amount discount correctly', async () => {
    mockDb.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              code: 'FLAT500',
              isActive: true,
              value: 500,
              type: 'fixed',
              minOrderAmount: 2000,
            },
            error: null,
          }),
        }),
      }),
    });

    const result = await discountsService.validateCoupon('FLAT500', 3500);
    expect(result.valid).toBe(true);
    expect(result.discountAmount).toBe(500);
  });
});
