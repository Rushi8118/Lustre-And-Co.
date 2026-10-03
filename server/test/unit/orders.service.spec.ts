import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from '../../src/modules/orders/orders.service.js';

describe('OrdersService (Stock & Zero-Trust Pricing Verification)', () => {
  let ordersService: OrdersService;
  let mockDb: any;
  let mockDiscountsService: any;
  let mockSettingsService: any;
  let mockConfigService: any;
  let mockBundlesService: any;
  let mockLoyaltyService: any;
  let mockInventoryService: any;
  let mockShippingService: any;
  let mockAnalyticsService: any;

  beforeEach(() => {
    mockDb = {
      from: vi.fn(),
      rpc: vi.fn(),
    };
    mockDiscountsService = {
      validateCoupon: vi.fn(),
      incrementUsage: vi.fn(),
    };
    mockSettingsService = {
      getCommerce: vi.fn().mockResolvedValue({
        codEnabled: true,
        freeShippingThreshold: 5000,
        shippingFee: 200,
        expressShippingFee: 400,
        taxPercent: 3,
      }),
    };
    mockConfigService = {
      get: vi.fn().mockReturnValue('test-key'),
    };
    mockBundlesService = {
      getBundleBySlug: vi.fn(),
    };
    mockLoyaltyService = {
      grantOrderRewards: vi.fn(),
    };
    mockInventoryService = {
      adjustStock: vi.fn(),
    };
    mockShippingService = {
      calculateRates: vi.fn().mockResolvedValue([]),
      createShipment: vi.fn().mockResolvedValue({ id: 'shipment-1' }),
      getSettings: vi.fn().mockResolvedValue({ autoCreateShipments: false }),
    };
    mockAnalyticsService = {
      recordEvent: vi.fn().mockResolvedValue({ id: 'event-1' }),
    };

    ordersService = new OrdersService(
      mockDb,
      mockDiscountsService,
      mockSettingsService,
      mockConfigService,
      mockBundlesService,
      mockLoyaltyService,
      mockInventoryService,
      mockShippingService,
      mockAnalyticsService,
    );
  });

  it('should reject order if the shopping bag is empty', async () => {
    const dto: any = {
      items: [],
      bundleItems: [],
      paymentMethod: 'cod',
    };

    await expect(ordersService.createOrder(dto)).rejects.toThrow(
      'Cannot create an order with an empty bag.',
    );
  });

  // Important test case: Customer cannot buy more than available stock
  it('should reject order when requested quantity exceeds available stock', async () => {
    mockDb.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'prod-123',
                  name: 'Solitaire Diamond Ring',
                  price: 25000,
                  stockQuantity: 2, // only 2 in stock
                  isActive: true,
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    const dto: any = {
      items: [
        {
          productId: 'prod-123',
          quantity: 5, // Attempting to purchase 5
          color: 'Gold',
          size: '7',
        },
      ],
      paymentMethod: 'cod',
    };

    await expect(ordersService.createOrder(dto)).rejects.toThrow(
      'Only 2 of "Solitaire Diamond Ring" left in stock.',
    );
  });

  // Important test case: Customer cannot buy an out-of-stock product
  it('should reject order when product is completely out of stock', async () => {
    mockDb.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'prod-999',
                  name: 'Gold Tennis Bracelet',
                  price: 45000,
                  stockQuantity: 0, // 0 in stock
                  isActive: true,
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    const dto: any = {
      items: [
        {
          productId: 'prod-999',
          quantity: 1,
        },
      ],
      paymentMethod: 'cod',
    };

    await expect(ordersService.createOrder(dto)).rejects.toThrow(
      '"Gold Tennis Bracelet" is out of stock.',
    );
  });

  // Important test case: Zero-trust pricing - Client cannot tamper with price
  it('should recalculate price strictly from the database ignoring client values', async () => {
    mockDb.from.mockImplementation((table: string) => {
      if (table === 'orders') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'order-1',
                  orderId: 'LST-12345678',
                  total: 25750, // 25000 + 3% GST (750)
                  payment: { status: 'pending', method: 'cod' },
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'products') {
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: 'prod-real',
                      name: 'Diamond Pendant',
                      price: 25000, // Actual database price
                      stockQuantity: 10,
                      isActive: true,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'payments') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'pay-1' }, error: null }),
            }),
          }),
        };
      }
      return {
        select: vi.fn(),
        insert: vi.fn().mockResolvedValue({ data: true, error: null }),
      };
    });

    mockDb.rpc.mockResolvedValue({ data: true, error: null });

    const dto: any = {
      items: [
        {
          productId: 'prod-real',
          quantity: 1,
          price: 1, // Tampered client price of ₹1
        },
      ],
      customer: {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        phone: '9876543210',
      },
      shippingAddress: {
        address: '123 Marine Drive',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      paymentMethod: 'cod',
    };

    const order = await ordersService.createOrder(dto);
    // Server recalculates based on actual DB price (25000) not client price (1)
    expect(order.total).toBe(25750);
  });
});
