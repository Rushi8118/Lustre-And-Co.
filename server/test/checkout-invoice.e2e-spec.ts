import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { SupabaseService } from '../src/database/supabase.service.js';

describe('E2E Checkout, Tax Invoice & Legal Documents Verification', () => {
  let app: INestApplication;
  let supabaseService: SupabaseService;
  let testProductId: string;
  let testProductPrice: number;
  let testProductSku: string;
  let createdOrderId: string;
  let createdOrderUuid: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
      }),
    );
    await app.init();

    supabaseService = moduleFixture.get<SupabaseService>(SupabaseService);

    // Fetch an active product from seeded database
    const { data: products, error } = await supabaseService.client
      .from('products')
      .select('id, name, price, sku, "stockQuantity"')
      .gt('stockQuantity', 2)
      .limit(1);

    if (error || !products || products.length === 0) {
      throw new Error(`Failed to query test product from database: ${error?.message}`);
    }

    testProductId = products[0].id;
    testProductPrice = Number(products[0].price);
    testProductSku = products[0].sku || 'LC-SKU-001';
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('Step 1: Successfully place an order via POST /orders with server-side pricing and tax calculation', async () => {
    const checkoutPayload = {
      customer: {
        fullName: 'Radhika Merchant',
        email: 'radhika.merchant@ambani.luxury',
        phone: '+91 98201 55555',
      },
      shippingAddress: {
        address: 'Antilia Tower, Altamount Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400026',
        country: 'India',
      },
      items: [
        {
          productId: testProductId,
          quantity: 1,
          size: 'Standard (16")',
          color: '18K Yellow Gold',
        },
      ],
      paymentMethod: 'cod',
      deliveryOption: 'express',
      notes: 'Please pack in signature wooden velvet case for anniversary gift.',
    };

    const response = await request(app.getHttpServer())
      .post('/orders')
      .send(checkoutPayload)
      .expect(201);

    const order = response.body;

    expect(order).toBeDefined();
    createdOrderId = order.orderId;
    createdOrderUuid = order.id;

    expect(order.orderId).toBeDefined();
    expect(order.orderId).toMatch(/^LST-/);
    expect(order.customer.email).toBe('radhika.merchant@ambani.luxury');
    expect(order.customer.fullName).toBe('Radhika Merchant');
    expect(order.payment?.method).toBe('cod');
    expect(order.status).toBe('Confirmed');

    // Server-side calculated totals
    expect(Number(order.subtotal)).toBe(testProductPrice);
    expect(Number(order.total)).toBeGreaterThan(testProductPrice);
    expect(Number(order.tax)).toBeGreaterThan(0);
  });

  it('Step 2: Verify order and auto-created shipment persistence in database', async () => {
    expect(createdOrderUuid).toBeDefined();

    // Verify order in database
    const { data: dbOrder, error: orderErr } = await supabaseService.client
      .from('orders')
      .select('*')
      .eq('id', createdOrderUuid)
      .single();

    expect(orderErr).toBeNull();
    expect(dbOrder).toBeDefined();
    expect(dbOrder.orderId).toBe(createdOrderId);

    // Verify shipment was automatically generated for this order
    const { data: dbShipment, error: shipErr } = await supabaseService.client
      .from('shipments')
      .select('*')
      .eq('order_id', createdOrderUuid)
      .maybeSingle();

    expect(shipErr).toBeNull();
    if (dbShipment) {
      expect(dbShipment.tracking_number).toBeDefined();
      expect(dbShipment.courier_name).toBeDefined();
    }
  });

  it('Step 3: Generate and verify GST Tax Invoice data via GET /documents/invoices/order/:orderId', async () => {
    const response = await request(app.getHttpServer())
      .get(`/documents/invoices/order/${createdOrderId}`)
      .expect(200);

    const invoice = response.body;

    expect(invoice).toBeDefined();
    expect(invoice.invoiceNumber).toMatch(/^INV-2026-/);
    const buyer = invoice.buyer || invoice.buyerDetails;
    expect(buyer).toBeDefined();
    expect(buyer.fullName).toBe('Radhika Merchant');
    expect(buyer.state).toBe('Maharashtra');
    expect(buyer.stateCode).toBe('27');

    // Intra-state supply (Maharashtra to Maharashtra) requires CGST + SGST
    expect(invoice.taxBreakdown).toBeDefined();
    expect(invoice.taxBreakdown.isInterstate).toBe(false);
    expect(invoice.taxBreakdown.cgstAmount).toBeGreaterThan(0);
    expect(invoice.taxBreakdown.sgstAmount).toBeGreaterThan(0);

    // Grand total and amount in words
    expect(invoice.grandTotal).toBeGreaterThan(0);
    expect(invoice.amountInWords).toContain('Rupees');

    // Persistence in order_invoices table
    const { data: dbInvoice, error: invErr } = await supabaseService.client
      .from('order_invoices')
      .select('*')
      .eq('order_id', createdOrderUuid)
      .single();

    expect(invErr).toBeNull();
    expect(dbInvoice).toBeDefined();
    expect(dbInvoice.invoice_number).toBe(invoice.invoiceNumber);
  });

  it('Step 4: Verify printable Tax Invoice HTML rendering via GET /documents/invoices/order/:orderId/html', async () => {
    const response = await request(app.getHttpServer())
      .get(`/documents/invoices/order/${createdOrderId}/html`)
      .expect(200)
      .expect('Content-Type', /text\/html/);

    const html = response.text;

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('TAX INVOICE');
    expect(html).toContain('Radhika Merchant');
    expect(html).toContain('Antilia Tower, Altamount Road');
    expect(html).toContain('HSN');
    expect(html).toContain('Lustre');
    expect(html).toContain('INV-2026-');
  });

  it('Step 5: Verify Packing Slip generation and HTML via GET /documents/packing-slips/order/:orderId/html', async () => {
    const response = await request(app.getHttpServer())
      .get(`/documents/packing-slips/order/${createdOrderId}/html`)
      .expect(200)
      .expect('Content-Type', /text\/html/);

    const html = response.text;

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Packing Slip');
    expect(html).toContain(createdOrderId);
    expect(html).toContain('Radhika Merchant');
  });

  it('Step 6: Verify Shipping Label generation and HTML via GET /documents/shipping-labels/order/:orderId/html', async () => {
    const response = await request(app.getHttpServer())
      .get(`/documents/shipping-labels/order/${createdOrderId}/html`)
      .expect(200)
      .expect('Content-Type', /text\/html/);

    const html = response.text;

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Shipping Label');
    expect(html).toContain('Deliver To:');
    expect(html).toContain('Radhika Merchant');
    expect(html).toContain('400026');
  });

  it('Step 7: Verify Order Summary document and HTML via GET /documents/order-summaries/order/:orderId/html', async () => {
    const response = await request(app.getHttpServer())
      .get(`/documents/order-summaries/order/${createdOrderId}/html`)
      .expect(200)
      .expect('Content-Type', /text\/html/);

    const html = response.text;

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Order Summary');
    expect(html).toContain(createdOrderId);
    expect(html).toContain('radhika.merchant@ambani.luxury');
  });
});
