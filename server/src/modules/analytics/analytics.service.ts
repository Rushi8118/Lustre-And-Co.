import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import ExcelJS from 'exceljs';
import { SupabaseService } from '../../database/supabase.service.js';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly db: SupabaseService) {}

  async recordEvent(input: {
    eventType: string;
    userId?: string;
    sessionId?: string;
    orderId?: string;
    productId?: string;
    deviceType?: string;
    country?: string;
    state?: string;
    city?: string;
    source?: string;
    value?: number;
    metadata?: Record<string, unknown>;
  }) {
    return this.trackEvent(input.userId, {
      ...input,
      metadata: input.source ? { ...input.metadata, source: input.source } : input.metadata,
    });
  }

  async trackEvent(
    userId: string | undefined,
    dto: {
      eventType: string;
      sessionId?: string;
      productId?: string;
      orderId?: string;
      pagePath?: string;
      deviceType?: string;
      browser?: string;
      operatingSystem?: string;
      country?: string;
      state?: string;
      city?: string;
      value?: number;
      metadata?: Record<string, unknown>;
    },
  ) {
    const { error } = await this.db.from('analytics_events').insert({
      user_id: userId || null,
      session_id: dto.sessionId || null,
      event_type: dto.eventType,
      product_id: dto.productId || null,
      order_id: dto.orderId || null,
      page_path: dto.pagePath || null,
      device_type: dto.deviceType || null,
      browser: dto.browser || null,
      operating_system: dto.operatingSystem || null,
      country: dto.country || null,
      state: dto.state || null,
      city: dto.city || null,
      value: dto.value || 0,
      metadata: dto.metadata || {},
    });

    if (error) {
      this.logger.warn(`Could not record analytics event: ${error.message}`);
      return { success: false };
    }

    return { success: true };
  }

  resolveDateRange(input: {
    preset?: string;
    from?: string;
    to?: string;
  }) {
    const now = new Date();

    if (input.preset === 'custom') {
      if (!input.from || !input.to) {
        throw new BadRequestException(
          'Custom date range requires from and to dates.',
        );
      }

      return {
        from: this.startOfDay(new Date(input.from)),
        to: this.endOfDay(new Date(input.to)),
      };
    }

    if (input.preset === 'today') {
      return {
        from: this.startOfDay(now),
        to: this.endOfDay(now),
      };
    }

    if (input.preset === 'last_7_days') {
      return {
        from: this.startOfDay(this.addDays(now, -6)),
        to: this.endOfDay(now),
      };
    }

    if (input.preset === 'last_30_days') {
      return {
        from: this.startOfDay(this.addDays(now, -29)),
        to: this.endOfDay(now),
      };
    }

    if (input.preset === 'this_month') {
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        to: this.endOfDay(now),
      };
    }

    if (input.preset === 'last_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);

      return {
        from: this.startOfDay(firstDay),
        to: this.endOfDay(lastDay),
      };
    }

    return {
      from: this.startOfDay(this.addDays(now, -29)),
      to: this.endOfDay(now),
    };
  }

  private startOfDay(value: Date) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  }

  private endOfDay(value: Date) {
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return date.toISOString();
  }

  private addDays(value: Date, days: number) {
    const date = new Date(value);
    date.setDate(date.getDate() + days);
    return date;
  }

  private async getOrders(from: string, to: string) {
    const { data, error } = await this.db
      .from('orders')
      .select('*')
      .gte('createdAt', from)
      .lte('createdAt', to);

    if (error) {
      const fallback = await this.db
        .from('orders')
        .select('*')
        .gte('created_at', from)
        .lte('created_at', to);

      if (fallback.error) {
        const all = await this.db.from('orders').select('*').limit(2000);
        if (!all.error && all.data) {
          const fromTime = new Date(from).getTime();
          const toTime = new Date(to).getTime();
          return all.data.filter((order: any) => {
            const time = new Date(order.createdAt || order.created_at || 0).getTime();
            return time >= fromTime && time <= toTime;
          });
        }
        throw new BadRequestException(fallback.error.message);
      }

      return fallback.data || [];
    }

    return data || [];
  }

  private numericOrderValue(order: any, field: string) {
    return Number(
      order[field] ||
        order[field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)] ||
        0,
    );
  }

  async getDashboard(input: {
    preset?: string;
    from?: string;
    to?: string;
  }) {
    const range = this.resolveDateRange(input);
    const orders = await this.getOrders(range.from, range.to);

    const validOrders = orders.filter(
      (order: any) =>
        !['Cancelled', 'cancelled', 'Failed', 'failed'].includes(order.status),
    );

    const refundedOrders = orders.filter((order: any) =>
      ['Refunded', 'refunded'].includes(
        order.paymentStatus || order.payment_status || order.status,
      ),
    );

    const grossRevenue = validOrders.reduce(
      (sum: number, order: any) => sum + this.numericOrderValue(order, 'total'),
      0,
    );

    const refundTotal = refundedOrders.reduce(
      (sum: number, order: any) => sum + this.numericOrderValue(order, 'total'),
      0,
    );

    const discountTotal = validOrders.reduce(
      (sum: number, order: any) => sum + this.numericOrderValue(order, 'discount'),
      0,
    );

    const shippingTotal = validOrders.reduce(
      (sum: number, order: any) =>
        sum + this.numericOrderValue(order, 'shippingCost'),
      0,
    );

    const netRevenue = grossRevenue - refundTotal;

    const averageOrderValue = validOrders.length
      ? grossRevenue / validOrders.length
      : 0;

    const userIds = validOrders
      .map((order: any) => order.user)
      .filter(Boolean);

    const uniqueCustomers = new Set(userIds);

    const customerOrderCounts = new Map<string, number>();

    for (const userId of userIds) {
      customerOrderCounts.set(
        userId,
        (customerOrderCounts.get(userId) || 0) + 1,
      );
    }

    const returningCustomers = [
      ...customerOrderCounts.values(),
    ].filter((count) => count > 1).length;

    const newCustomers = Math.max(
      0,
      uniqueCustomers.size - returningCustomers,
    );

    const codOrders = validOrders.filter(
      (order: any) =>
        String(
          order.paymentMethod || order.payment_method || '',
        ).toLowerCase() === 'cod',
    ).length;

    const onlineOrders = validOrders.length - codOrders;

    const couponUsage = new Map<string, number>();

    for (const order of validOrders) {
      const coupon =
        order.couponCode || order.coupon_code || order.coupon;

      if (coupon) {
        couponUsage.set(
          coupon,
          (couponUsage.get(coupon) || 0) + 1,
        );
      }
    }

    const topProducts = this.calculateProductMetrics(validOrders);
    const categoryMetrics = await this.calculateCategoryMetrics(validOrders);
    const locationMetrics = this.calculateLocationMetrics(validOrders);
    const deviceMetrics = await this.calculateDeviceMetrics(range.from, range.to);
    const trafficMetrics = await this.calculateTrafficMetrics(range.from, range.to);
    const customerLifetimeValue = await this.calculateCustomerLifetimeValue();

    return {
      range,
      summary: {
        grossRevenue,
        netRevenue,
        refundTotal,
        discountTotal,
        shippingTotal,
        orderCount: validOrders.length,
        averageOrderValue,
        uniqueCustomers: uniqueCustomers.size,
        newCustomers,
        returningCustomers,
        returningCustomerRate: uniqueCustomers.size
          ? returningCustomers / uniqueCustomers.size
          : 0,
        codOrders,
        onlineOrders,
        couponUsage: [...couponUsage.entries()].map(([code, count]) => ({
          code,
          count,
        })),
        customerLifetimeValue,
      },
      conversion: {
        checkoutStarted: trafficMetrics.checkoutStarted,
        checkoutCompleted: trafficMetrics.checkoutCompleted,
        conversionRate:
          trafficMetrics.checkoutStarted > 0
            ? trafficMetrics.checkoutCompleted / trafficMetrics.checkoutStarted
            : 0,
        abandonedCarts: trafficMetrics.abandonedCarts,
        cartAbandonmentRate:
          trafficMetrics.checkoutStarted > 0
            ? trafficMetrics.abandonedCarts / trafficMetrics.checkoutStarted
            : 0,
      },
      topProducts: topProducts
        .sort((left, right) => right.revenue - left.revenue)
        .slice(0, 20),
      lowPerformingProducts: topProducts
        .sort((left, right) => {
          if (left.purchaseCount !== right.purchaseCount) {
            return left.purchaseCount - right.purchaseCount;
          }
          return left.viewCount - right.viewCount;
        })
        .slice(0, 20),
      bestCategories: categoryMetrics
        .sort((left, right) => right.revenue - left.revenue)
        .slice(0, 20),
      salesByDate: this.calculateSalesByDate(validOrders),
      salesByLocation: locationMetrics,
      salesByDevice: deviceMetrics,
    };
  }

  private calculateProductMetrics(orders: any[]) {
    const map = new Map<string, any>();

    for (const order of orders) {
      const items = [
        ...(Array.isArray(order.items) ? order.items : []),
        ...(Array.isArray(order.products) ? order.products : []),
      ];

      for (const item of items) {
        const productId =
          item.productId || item.product_id || item.product || item.id;

        if (!productId) continue;

        const quantity = Number(item.quantity || 1);
        const price = Number(
          item.price || item.unitPrice || item.unit_price || 0,
        );

        const existing = map.get(productId) || {
          productId,
          name: item.name || 'Product',
          viewCount: 0,
          addToCartCount: 0,
          purchaseCount: 0,
          revenue: 0,
        };

        existing.purchaseCount += quantity;
        existing.revenue += price * quantity;

        map.set(productId, existing);
      }
    }

    return [...map.values()];
  }

  private async calculateCategoryMetrics(orders: any[]) {
    const metrics = new Map<string, any>();
    const productIds = new Set<string>();

    for (const order of orders) {
      const items = Array.isArray(order.items) ? order.items : [];

      for (const item of items) {
        const productId =
          item.productId || item.product_id || item.product;

        if (productId) productIds.add(productId);
      }
    }

    const { data } = await this.db
      .from('products')
      .select('id,category,categoryName')
      .in('id', [...productIds]);

    const productCategories = new Map(
      (data || []).map((product: any) => [
        product.id,
        product.categoryName || product.category || 'Uncategorized',
      ]),
    );

    for (const order of orders) {
      const items = Array.isArray(order.items) ? order.items : [];

      for (const item of items) {
        const productId =
          item.productId || item.product_id || item.product;

        const category =
          productCategories.get(productId) || 'Uncategorized';

        const quantity = Number(item.quantity || 1);
        const price = Number(
          item.price || item.unitPrice || item.unit_price || 0,
        );

        const existing = metrics.get(category) || {
          category,
          quantity: 0,
          revenue: 0,
        };

        existing.quantity += quantity;
        existing.revenue += quantity * price;

        metrics.set(category, existing);
      }
    }

    return [...metrics.values()];
  }

  private calculateLocationMetrics(orders: any[]) {
    const metrics = new Map<string, any>();

    for (const order of orders) {
      const address =
        order.shippingAddress ||
        order.deliveryAddress ||
        order.address ||
        {};

      const location =
        [address.city, address.state, address.country]
          .filter(Boolean)
          .join(', ') || 'Unknown';

      const existing = metrics.get(location) || {
        location,
        orders: 0,
        revenue: 0,
      };

      existing.orders++;
      existing.revenue += this.numericOrderValue(order, 'total');

      metrics.set(location, existing);
    }

    return [...metrics.values()].sort(
      (left, right) => right.revenue - left.revenue,
    );
  }

  private async calculateDeviceMetrics(from: string, to: string) {
    const { data, error } = await this.db
      .from('analytics_events')
      .select('device_type,event_type,value')
      .gte('created_at', from)
      .lte('created_at', to);

    if (error) return [];

    const metrics = new Map<string, any>();

    for (const event of data || []) {
      const device = event.device_type || 'unknown';

      const existing = metrics.get(device) || {
        device,
        events: 0,
        purchases: 0,
        revenue: 0,
      };

      existing.events++;

      if (event.event_type === 'purchase') {
        existing.purchases++;
        existing.revenue += Number(event.value || 0);
      }

      metrics.set(device, existing);
    }

    return [...metrics.values()];
  }

  private async calculateTrafficMetrics(from: string, to: string) {
    const { data, error } = await this.db
      .from('analytics_events')
      .select('event_type')
      .gte('created_at', from)
      .lte('created_at', to);

    if (error) {
      return {
        checkoutStarted: 0,
        checkoutCompleted: 0,
        abandonedCarts: 0,
      };
    }

    const checkoutStarted = (data || []).filter(
      (event: any) => event.event_type === 'checkout_started',
    ).length;

    const checkoutCompleted = (data || []).filter(
      (event: any) =>
        event.event_type === 'purchase' ||
        event.event_type === 'checkout_completed',
    ).length;

    const abandonedCarts = (data || []).filter(
      (event: any) => event.event_type === 'cart_abandoned',
    ).length;

    return {
      checkoutStarted,
      checkoutCompleted,
      abandonedCarts,
    };
  }

  private calculateSalesByDate(orders: any[]) {
    const metrics = new Map<string, any>();

    for (const order of orders) {
      const rawDate =
        order.createdAt || order.created_at || new Date().toISOString();

      const date = new Date(rawDate).toISOString().slice(0, 10);

      const existing = metrics.get(date) || {
        date,
        orders: 0,
        revenue: 0,
      };

      existing.orders++;
      existing.revenue += this.numericOrderValue(order, 'total');

      metrics.set(date, existing);
    }

    return [...metrics.values()].sort((left, right) =>
      left.date.localeCompare(right.date),
    );
  }

  private async calculateCustomerLifetimeValue() {
    const { data, error } = await this.db
      .from('orders')
      .select('user,total,status');

    if (error) return 0;

    const customers = new Map<string, number>();

    for (const order of data || []) {
      if (
        !order.user ||
        ['Cancelled', 'cancelled'].includes(order.status)
      ) {
        continue;
      }

      customers.set(
        order.user,
        (customers.get(order.user) || 0) +
          this.numericOrderValue(order, 'total'),
      );
    }

    if (!customers.size) return 0;

    return (
      [...customers.values()].reduce((sum, value) => sum + value, 0) /
      customers.size
    );
  }

  async exportData(
    exportType:
      | 'orders'
      | 'customers'
      | 'products'
      | 'revenue'
      | 'inventory',
    format: 'csv' | 'xlsx',
    rangeInput: {
      preset?: string;
      from?: string;
      to?: string;
    },
  ) {
    const range = this.resolveDateRange(rangeInput);
    const rows = await this.getExportRows(exportType, range);

    if (format === 'xlsx') {
      return this.createExcel(rows, exportType);
    }

    return this.createCsv(rows);
  }

  private async getExportRows(
    exportType: string,
    range: { from: string; to: string },
  ) {
    if (exportType === 'orders') {
      const orders = await this.getOrders(range.from, range.to);

      return orders.map((order: any) => ({
        id: order.id,
        orderNumber: order.orderNumber || order.orderId || order.order_id || '',
        customer:
          order.customerName ||
          order.shippingAddress?.fullName ||
          order.email ||
          '',
        total: this.numericOrderValue(order, 'total'),
        status: order.status,
        paymentMethod: order.paymentMethod || order.payment_method || '',
        createdAt: order.createdAt || order.created_at || '',
      }));
    }

    if (exportType === 'customers') {
      const { data, error } = await this.db
        .from('users')
        .select('id,name,email,phone,createdAt,created_at');

      if (error) throw new BadRequestException(error.message);

      return (data || []).map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt || user.created_at,
      }));
    }

    if (exportType === 'products') {
      const { data, error } = await this.db.from('products').select('*');

      if (error) throw new BadRequestException(error.message);

      return (data || []).map((product: any) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        category: product.categoryName || product.category,
        price: product.price,
        originalPrice: product.originalPrice || product.original_price,
        stock: product.stock_quantity ?? product.stock ?? 0,
        availability: product.availability,
        rating: product.rating,
      }));
    }

    if (exportType === 'inventory') {
      const { data, error } = await this.db
        .from('products')
        .select(
          'id,name,sku,barcode,stock,stock_quantity,reserved_stock,damaged_stock,reorder_level',
        );

      if (error) throw new BadRequestException(error.message);

      return (data || []).map((product: any) => {
        const stockQty = Number(product.stock_quantity ?? product.stock ?? 0);
        const reserved = Number(product.reserved_stock || 0);
        const damaged = Number(product.damaged_stock || 0);

        return {
          id: product.id,
          name: product.name,
          sku: product.sku || '',
          barcode: product.barcode || '',
          stockQuantity: stockQty,
          reservedStock: reserved,
          damagedStock: damaged,
          availableStock: Math.max(0, stockQty - reserved - damaged),
          reorderLevel: product.reorder_level || 5,
        };
      });
    }

    const dashboard = await this.getDashboard({
      from: range.from,
      to: range.to,
      preset: 'custom',
    });

    return dashboard.salesByDate;
  }

  private createCsv(rows: Record<string, unknown>[]) {
    if (!rows.length) return '';

    const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];

    const escape = (value: unknown) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`;

    return [
      columns.map(escape).join(','),
      ...rows.map((row) =>
        columns.map((column) => escape(row[column])).join(','),
      ),
    ].join('\r\n');
  }

  private async createExcel(
    rows: Record<string, unknown>[],
    name: string,
  ) {
    const WorkbookConstructor = (ExcelJS as any).Workbook || ExcelJS;
    const workbook = new WorkbookConstructor();
    const worksheet = workbook.addWorksheet(name);

    if (rows.length) {
      const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];

      worksheet.columns = columns.map((column) => ({
        header: column,
        key: column,
        width: Math.max(16, column.length + 4),
      }));

      for (const row of rows) {
        worksheet.addRow(row);
      }

      worksheet.getRow(1).font = {
        bold: true,
      };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
