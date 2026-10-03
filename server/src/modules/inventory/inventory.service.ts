import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { SupabaseService } from '../../database/supabase.service.js';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto.js';
import { CommitReservationDto } from './dto/commit-reservation.dto.js';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto.js';
import { CreateSupplierDto } from './dto/create-supplier.dto.js';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto.js';
import { ReleaseReservationDto } from './dto/release-reservation.dto.js';
import { ReserveInventoryDto } from './dto/reserve-inventory.dto.js';
import { UpdateProductInventoryDto } from './dto/update-product-inventory.dto.js';
import { MarketingService } from '../marketing/marketing.service.js';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly db: SupabaseService,
    private readonly marketingService: MarketingService,
  ) {}

  // ─── Mapping ────────────────────────────────────────────────────────────────

  private mapProduct(row: any) {
    const stockQuantity = Number(row.stock_quantity ?? row.stockQuantity ?? 0);
    const reservedStock = Number(row.reserved_stock ?? row.reservedStock ?? 0);
    const damagedStock = Number(row.damaged_stock ?? row.damagedStock ?? 0);

    return {
      id: row.id,
      name: row.name,
      slug: row.slug ?? null,
      sku: row.sku || null,
      barcode: row.barcode || null,
      stockQuantity,
      reservedStock,
      damagedStock,
      availableStock: Math.max(0, stockQuantity - reservedStock - damagedStock),
      reorderLevel: Number(row.reorder_level ?? row.reorderLevel ?? 5),
      reorderQuantity: Number(row.reorder_quantity ?? row.reorderQuantity ?? 10),
      warehouseLocation: row.warehouse_location || row.warehouseLocation || null,
      supplierId: row.supplier_id || row.supplierId || null,
      costPrice: row.cost_price ?? row.costPrice ?? null,
      isActive: row.is_active ?? row.isActive ?? true,
      image: row.thumbnail || row.image || row.images?.[0] || null,
    };
  }

  private genIdempotencyKey(prefix: string) {
    return `${prefix}:${Date.now()}:${randomBytes(8).toString('hex')}`;
  }

  // ─── Products / Inventory ────────────────────────────────────────────────────

  async getProductInventory(productId: string) {
    const { data, error } = await this.db
      .from('products')
      .select('*')
      .eq('id', productId)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Product not found.');
    return this.mapProduct(data);
  }

  async listInventory(options: {
    search?: string;
    lowStock?: boolean;
    outOfStock?: boolean;
    page?: number;
    limit?: number;
  } = {}) {
    const page = Math.max(1, Number(options.page || 1));
    const limit = Math.min(100, Math.max(1, Number(options.limit || 30)));

    let query = this.db
      .from('products')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true });

    if (options.search?.trim()) {
      const s = options.search.trim();
      query = query.or(`name.ilike.%${s}%,sku.ilike.%${s}%,barcode.ilike.%${s}%`);
    }

    const { data, error, count } = await query;
    if (error) throw new BadRequestException(error.message);

    let products = (data || []).map((r) => this.mapProduct(r));

    if (options.outOfStock) {
      products = products.filter((p) => p.availableStock <= 0);
    } else if (options.lowStock) {
      products = products.filter(
        (p) => p.availableStock > 0 && p.availableStock <= p.reorderLevel,
      );
    }

    const filtered = options.lowStock || options.outOfStock;
    const total = filtered ? products.length : (count || products.length);
    const start = (page - 1) * limit;

    return {
      products: products.slice(start, start + limit),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async updateProductInventory(productId: string, dto: UpdateProductInventoryDto) {
    const payload: Record<string, unknown> = {};
    if (dto.sku !== undefined) payload.sku = dto.sku.trim() || null;
    if (dto.barcode !== undefined) payload.barcode = dto.barcode.trim() || null;
    if (dto.reorderLevel !== undefined) payload.reorder_level = dto.reorderLevel;
    if (dto.reorderQuantity !== undefined) payload.reorder_quantity = dto.reorderQuantity;
    if (dto.warehouseLocation !== undefined) payload.warehouse_location = dto.warehouseLocation;
    if (dto.supplierId !== undefined) payload.supplier_id = dto.supplierId || null;
    if (dto.costPrice !== undefined) payload.cost_price = dto.costPrice;

    if (!Object.keys(payload).length) return this.getProductInventory(productId);

    const { data, error } = await this.db
      .from('products')
      .update(payload)
      .eq('id', productId)
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new BadRequestException('SKU or barcode is already used by another product.');
      }
      throw new BadRequestException(error.message);
    }
    return this.mapProduct(data);
  }

  // ─── Stock Adjustments ────────────────────────────────────────────────────────

  async adjustInventory(dto: AdjustInventoryDto, createdBy?: string) {
    const key = dto.idempotencyKey || this.genIdempotencyKey(`adj:${dto.productId}`);
    const { data, error } = await this.db.rpc('adjust_inventory_stock', {
      p_product_id: dto.productId,
      p_quantity: dto.quantity,
      p_movement_type: dto.movementType,
      p_reason: dto.reason,
      p_idempotency_key: key,
      p_created_by: createdBy || null,
      p_warehouse_id: dto.warehouseId || null,
      p_location_id: dto.locationId || null,
    });

    if (error) throw new BadRequestException(error.message);
    await this.refreshProductAlerts(dto.productId);

    if (dto.quantity > 0) {
      this.marketingService.notifyBackInStock(dto.productId).catch((err) => {
        this.logger.warn(
          `Back-in-stock notification check failed for product ${dto.productId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      });
    }

    return data;
  }

  // ─── Reservations ─────────────────────────────────────────────────────────────

  async reserveInventory(dto: ReserveInventoryDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('At least one inventory item is required.');
    }

    // Merge duplicate product lines
    const map = new Map<string, number>();
    for (const item of dto.items) {
      map.set(item.productId, (map.get(item.productId) || 0) + Number(item.quantity));
    }
    const items = [...map.entries()].map(([productId, quantity]) => ({ productId, quantity }));

    const durationMinutes = Math.min(120, Math.max(1, dto.durationMinutes || 15));
    const expiresAt = new Date(Date.now() + durationMinutes * 60_000).toISOString();

    const { data, error } = await this.db.rpc('reserve_inventory', {
      p_reservation_token: dto.reservationToken,
      p_cart_id: dto.cartId || null,
      p_user_id: dto.userId || null,
      p_expires_at: expiresAt,
      p_items: items,
    });

    if (error) throw new BadRequestException(error.message);

    for (const item of items) {
      await this.refreshProductAlerts(item.productId);
    }
    return data;
  }

  async releaseReservation(reservationToken: string, dto?: ReleaseReservationDto) {
    const { data, error } = await this.db.rpc('release_inventory_reservation', {
      p_reservation_token: reservationToken,
      p_status: dto?.status || 'released',
    });
    if (error) throw new BadRequestException(error.message);
    await this.refreshAlertsForReservation(reservationToken).catch(() => null);
    return data;
  }

  async commitReservation(reservationToken: string, dto: CommitReservationDto) {
    const reservation = await this.getReservationByToken(reservationToken);

    const { data, error } = await this.db.rpc('commit_inventory_reservation', {
      p_reservation_token: reservationToken,
      p_order_id: dto.orderId,
    });
    if (error) throw new BadRequestException(error.message);

    for (const item of reservation.items || []) {
      await this.refreshProductAlerts(item.product_id);
    }
    return data;
  }

  async releaseExpiredReservations() {
    const { data, error } = await this.db
      .from('inventory_reservations')
      .select('reservation_token')
      .eq('status', 'active')
      .lte('expires_at', new Date().toISOString())
      .limit(500);

    if (error) throw new BadRequestException(error.message);

    let released = 0;
    for (const row of data || []) {
      try {
        await this.releaseReservation(row.reservation_token, { status: 'expired' });
        released++;
      } catch (err) {
        this.logger.warn(
          `Could not release reservation ${row.reservation_token}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    return { processed: data?.length || 0, released };
  }

  private async getReservationByToken(token: string) {
    const { data, error } = await this.db
      .from('inventory_reservations')
      .select('*, items:inventory_reservation_items(*)')
      .eq('reservation_token', token)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Inventory reservation not found.');
    return data;
  }

  // ─── Movements ────────────────────────────────────────────────────────────────

  async getMovements(options: {
    productId?: string;
    movementType?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const page = Math.max(1, Number(options.page || 1));
    const limit = Math.min(100, Math.max(1, Number(options.limit || 50)));

    let query = this.db
      .from('inventory_movements')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (options.productId) query = query.eq('product_id', options.productId);
    if (options.movementType) query = query.eq('movement_type', options.movementType);

    const { data, error, count } = await query.range((page - 1) * limit, page * limit - 1);
    if (error) throw new BadRequestException(error.message);

    return {
      movements: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil((count || 0) / limit)),
    };
  }

  // ─── Alerts ───────────────────────────────────────────────────────────────────

  async getAlerts(options: { status?: string; alertType?: string } = {}) {
    let query = this.db
      .from('inventory_alerts')
      .select('*, product:products(id, name, slug)')
      .order('created_at', { ascending: false });

    if (options.status) query = query.eq('status', options.status);
    if (options.alertType) query = query.eq('alert_type', options.alertType);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async acknowledgeAlert(id: string) {
    const { data, error } = await this.db
      .from('inventory_alerts')
      .update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async refreshProductAlerts(productId: string) {
    const product = await this.getProductInventory(productId);

    if (product.availableStock <= 0) {
      await this.openAlert(product, 'out_of_stock', `"${product.name}" is out of stock.`);
      await this.resolveAlert(product.id, 'low_stock');
    } else if (product.availableStock <= product.reorderLevel) {
      await this.openAlert(
        product,
        'low_stock',
        `Only ${product.availableStock} of "${product.name}" remain in stock.`,
      );
      await this.resolveAlert(product.id, 'out_of_stock');
    } else {
      await this.resolveAlert(product.id, 'low_stock');
      await this.resolveAlert(product.id, 'out_of_stock');
    }

    return product;
  }

  async refreshAllAlerts() {
    const { data, error } = await this.db.from('products').select('id');
    if (error) throw new BadRequestException(error.message);

    let processed = 0;
    for (const p of data || []) {
      await this.refreshProductAlerts(p.id);
      processed++;
    }
    return { processed };
  }

  private async openAlert(
    product: any,
    alertType: 'low_stock' | 'out_of_stock',
    message: string,
  ) {
    const { data: existing } = await this.db
      .from('inventory_alerts')
      .select('id')
      .eq('product_id', product.id)
      .is('warehouse_id', null)
      .eq('alert_type', alertType)
      .in('status', ['open', 'acknowledged'])
      .maybeSingle();

    if (existing) {
      await this.db
        .from('inventory_alerts')
        .update({ available_quantity: product.availableStock, message })
        .eq('id', existing.id);
      return;
    }

    await this.db.from('inventory_alerts').insert({
      product_id: product.id,
      alert_type: alertType,
      status: 'open',
      available_quantity: product.availableStock,
      reorder_level: product.reorderLevel,
      message,
    });
  }

  private async resolveAlert(productId: string, alertType: 'low_stock' | 'out_of_stock') {
    await this.db
      .from('inventory_alerts')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('product_id', productId)
      .eq('alert_type', alertType)
      .in('status', ['open', 'acknowledged']);
  }

  private async refreshAlertsForReservation(token: string) {
    const { data } = await this.db
      .from('inventory_reservations')
      .select('items:inventory_reservation_items(product_id)')
      .eq('reservation_token', token)
      .maybeSingle();

    for (const item of (data as any)?.items || []) {
      await this.refreshProductAlerts(item.product_id);
    }
  }

  // ─── Suppliers ────────────────────────────────────────────────────────────────

  async listSuppliers() {
    const { data, error } = await this.db
      .from('inventory_suppliers')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async createSupplier(dto: CreateSupplierDto) {
    const { data, error } = await this.db
      .from('inventory_suppliers')
      .insert({
        name: dto.name.trim(),
        code: dto.code?.trim() || null,
        contact_name: dto.contactName || null,
        email: dto.email || null,
        phone: dto.phone || null,
        address: dto.address || null,
        city: dto.city || null,
        state: dto.state || null,
        country: dto.country || null,
        postal_code: dto.postalCode || null,
        payment_terms: dto.paymentTerms || null,
        notes: dto.notes || null,
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') throw new BadRequestException('Supplier code is already in use.');
      throw new BadRequestException(error.message);
    }
    return data;
  }

  // ─── Purchase Orders ─────────────────────────────────────────────────────────

  async listPurchaseOrders() {
    const { data, error } = await this.db
      .from('purchase_orders')
      .select('*, supplier:inventory_suppliers(name, code)')
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async getPurchaseOrder(id: string) {
    const { data, error } = await this.db
      .from('purchase_orders')
      .select('*, items:purchase_order_items(*), supplier:inventory_suppliers(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Purchase order not found.');
    return data;
  }

  async createPurchaseOrder(dto: CreatePurchaseOrderDto, createdBy?: string) {
    if (!dto.items?.length) {
      throw new BadRequestException('Purchase order must contain at least one item.');
    }

    const poNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const subtotal = dto.items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitCost), 0);
    const tax = Number(dto.tax || 0);
    const shipping = Number(dto.shipping || 0);

    const { data: po, error: poError } = await this.db
      .from('purchase_orders')
      .insert({
        purchase_order_number: poNumber,
        supplier_id: dto.supplierId,
        warehouse_id: dto.warehouseId || null,
        status: 'draft',
        expected_delivery_date: dto.expectedDeliveryDate || null,
        notes: dto.notes || null,
        subtotal,
        tax,
        shipping,
        total: subtotal + tax + shipping,
        created_by: createdBy || null,
      })
      .select('*')
      .single();

    if (poError) throw new BadRequestException(poError.message);

    const { error: itemsError } = await this.db.from('purchase_order_items').insert(
      dto.items.map((item) => ({
        purchase_order_id: po.id,
        product_id: item.productId,
        ordered_quantity: item.quantity,
        unit_cost: item.unitCost,
      })),
    );
    if (itemsError) throw new BadRequestException(itemsError.message);

    return this.getPurchaseOrder(po.id);
  }

  async receivePurchaseOrder(id: string, dto: ReceivePurchaseOrderDto, createdBy?: string) {
    const po = await this.getPurchaseOrder(id);

    if (po.status === 'cancelled' || po.status === 'received') {
      throw new BadRequestException('This purchase order cannot receive more stock.');
    }

    for (const item of dto.items) {
      const line = po.items.find((l: any) => l.product_id === item.productId);
      if (!line) {
        throw new BadRequestException(`Product ${item.productId} is not on this purchase order.`);
      }
      const remaining = Number(line.ordered_quantity) - Number(line.received_quantity);
      if (item.quantity > remaining) {
        throw new BadRequestException(
          `Cannot receive more than remaining quantity (${remaining}) for product ${item.productId}.`,
        );
      }

      await this.adjustInventory(
        {
          productId: item.productId,
          quantity: item.quantity,
          movementType: 'purchase_received',
          reason: `Received against PO ${po.purchase_order_number}`,
          idempotencyKey: `po-receive:${id}:${item.productId}:${Date.now()}`,
          warehouseId: dto.warehouseId,
        },
        createdBy,
      );

      await this.db
        .from('purchase_order_items')
        .update({ received_quantity: Number(line.received_quantity) + item.quantity })
        .eq('id', line.id);
    }

    const updated = await this.getPurchaseOrder(id);
    const allDone = updated.items.every(
      (i: any) => Number(i.received_quantity) >= Number(i.ordered_quantity),
    );
    const partial = updated.items.some((i: any) => Number(i.received_quantity) > 0);

    await this.db
      .from('purchase_orders')
      .update({
        status: allDone ? 'received' : partial ? 'partially_received' : 'submitted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return this.getPurchaseOrder(id);
  }

  // ─── CSV Export ───────────────────────────────────────────────────────────────

  async exportInventoryCsv() {
    const { data, error } = await this.db
      .from('products')
      .select(
        'id,name,slug,sku,barcode,stock_quantity,reserved_stock,damaged_stock,reorder_level,reorder_quantity,warehouse_location,cost_price',
      )
      .order('name', { ascending: true });

    if (error) throw new BadRequestException(error.message);

    const header = [
      'id','name','slug','sku','barcode',
      'stock_quantity','reserved_stock','damaged_stock','available_stock',
      'reorder_level','reorder_quantity','warehouse_location','cost_price',
    ];

    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const rows = (data || []).map((r) => {
      const sq = Number(r.stock_quantity || 0);
      const rs = Number(r.reserved_stock || 0);
      const ds = Number(r.damaged_stock || 0);
      return [
        r.id, r.name, r.slug, r.sku, r.barcode,
        sq, rs, ds, Math.max(0, sq - rs - ds),
        r.reorder_level, r.reorder_quantity, r.warehouse_location, r.cost_price,
      ];
    });

    return [header, ...rows].map((row) => row.map(esc).join(',')).join('\n');
  }
}
