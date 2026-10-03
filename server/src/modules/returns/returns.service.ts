import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { DocumentsService } from '../documents/documents.service.js';
import { LoyaltyService } from '../loyalty/loyalty.service.js';
import { ShippingService } from '../shipping/shipping.service.js';
import { CreateReturnRequestDto } from './dto/create-return.dto.js';
import {
  AdminApproveReturnDto,
  AdminCompleteExchangeDto,
  AdminInspectReturnDto,
  AdminProcessRefundDto,
  AdminRejectReturnDto,
  AdminSchedulePickupDto,
} from './dto/admin-return-actions.dto.js';
import type {
  OrderReturn,
  ReturnItem,
  ReturnPickupAddress,
  ReturnStatus,
  ReturnStatusHistoryEntry,
} from './schemas/return.schema.js';

@Injectable()
export class ReturnsService {
  private readonly logger = new Logger(ReturnsService.name);

  constructor(
    @Inject(SupabaseService) private readonly db: SupabaseService,
    @Inject(SettingsService) private readonly settingsService: SettingsService,
    @Inject(DocumentsService) private readonly documentsService: DocumentsService,
    @Inject(LoyaltyService) private readonly loyaltyService: LoyaltyService,
    @Inject(ShippingService) private readonly shippingService: ShippingService,
  ) {}

  private async getNextReturnNumber(prefix: 'RET' | 'EXC'): Promise<string> {
    const currentYear = new Date().getFullYear();
    const docType = prefix === 'RET' ? 'return' : 'exchange';

    try {
      const { data, error } = await this.db.rpc('get_next_document_number', {
        p_doc_type: docType,
        p_year: currentYear,
        p_prefix: prefix,
      });

      if (!error && data) return data as string;
    } catch {
      // Fallback
    }

    const seqId = `${docType}-${currentYear}`;
    const { data: current } = await this.db
      .from('document_sequences')
      .select('last_number')
      .eq('id', seqId)
      .maybeSingle();

    const nextNum = (current?.last_number || 0) + 1;

    await this.db.from('document_sequences').upsert({
      id: seqId,
      doc_type: docType,
      year: currentYear,
      last_number: nextNum,
      updated_at: new Date().toISOString(),
    });

    return `${prefix}-${currentYear}-${String(nextNum).padStart(4, '0')}`;
  }

  async getOrder(orderIdentifier: string) {
    const trimmed = (orderIdentifier || '').trim();
    if (!trimmed) throw new BadRequestException('Order identifier is required.');

    const isId =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        trimmed,
      );

    const query = this.db.from('orders').select('*');
    const { data, error } = await (isId
      ? query.or(`id.eq.${trimmed},orderId.eq.${trimmed}`).maybeSingle()
      : query.eq('orderId', trimmed).maybeSingle());

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException(`Order '${trimmed}' was not found.`);

    return data;
  }

  async checkEligibility(orderIdentifier: string, userId?: string) {
    const order = await this.getOrder(orderIdentifier);
    const commerce = await this.settingsService.getCommerce();

    const windowDays = Number(commerce.returnWindowDays || 7);
    const windowMs = windowDays * 24 * 60 * 60 * 1000;

    // Check ownership if user provided
    if (userId && order.user && order.user !== userId) {
      throw new ForbiddenException('You do not have access to this order.');
    }

    // Determine delivery date from status history or updatedAt
    const deliveredEntry = (order.statusHistory || [])
      .slice()
      .reverse()
      .find((h: any) => h.status === 'Delivered');

    const deliveryTime = deliveredEntry?.at || order.updatedAt || order.createdAt;
    const elapsedMs = Date.now() - new Date(deliveryTime).getTime();
    const isDelivered = order.status === 'Delivered';
    const isWithinWindow = isDelivered && elapsedMs <= windowMs;
    const daysRemaining = Math.max(
      0,
      Math.ceil((windowMs - elapsedMs) / (24 * 60 * 60 * 1000)),
    );

    // Check for existing return requests
    const { data: existingReturns } = await this.db
      .from('order_returns')
      .select('id, return_number, status, request_type, created_at')
      .eq('order_id', order.id)
      .neq('status', 'Cancelled');

    const hasActiveReturn = (existingReturns || []).some((r: any) =>
      !['Rejected', 'Completed'].includes(r.status),
    );

    const items = (order.items || []).map((item: any, idx: number) => ({
      productId: item.productId || item.product || String(idx),
      name: item.name,
      color: item.color,
      size: item.size,
      quantity: Number(item.quantity || 1),
      price: Number(item.price || 0),
      image: item.image,
    }));

    return {
      orderId: order.id,
      orderNumber: order.orderId || order.id,
      status: order.status,
      isDelivered,
      isEligible: isWithinWindow && !hasActiveReturn,
      windowDays,
      daysRemaining,
      deliveredAt: isDelivered ? deliveryTime : null,
      hasActiveReturn,
      activeReturn: existingReturns?.[0] || null,
      storeCreditBonusPercent: 5.0, // 5% bonus store credit incentive
      items,
      allowedReasons: [
        'Size did not fit (too large / too small)',
        'Defective or damaged piece received',
        'Incorrect item sent by mistake',
        'Item does not match website photographs',
        'Quality or finish below expectations',
        'Changed mind / no longer needed',
        'Ordered multiple sizes to try',
      ],
    };
  }

  async requestReturn(
    dto: CreateReturnRequestDto,
    userId?: string,
  ): Promise<OrderReturn> {
    const eligibility = await this.checkEligibility(dto.orderIdentifier, userId);
    const order = await this.getOrder(dto.orderIdentifier);

    if (!eligibility.isDelivered) {
      throw new BadRequestException(
        'Return or exchange can only be requested once the order has been delivered.',
      );
    }

    if (!eligibility.isEligible && eligibility.hasActiveReturn) {
      throw new BadRequestException(
        'A return or exchange request is already active for this order.',
      );
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Please select at least one item to return or exchange.');
    }

    const orderItems: any[] = order.items || [];
    const validatedItems: ReturnItem[] = [];
    let calculatedRefund = 0;

    for (const reqItem of dto.items) {
      const match = orderItems.find(
        (oi) =>
          oi.productId === reqItem.productId ||
          oi.product === reqItem.productId ||
          oi.name === reqItem.name,
      );

      if (!match) {
        throw new BadRequestException(`Item ${reqItem.name} was not found in this order.`);
      }

      const availableQty = Number(match.quantity || 1);
      const returnQty = Number(reqItem.quantity || 1);
      if (returnQty > availableQty) {
        throw new BadRequestException(
          `Cannot return ${returnQty} of ${reqItem.name}; only ${availableQty} purchased.`,
        );
      }

      const unitPrice = Number(match.price || 0);
      const subtotal = unitPrice * returnQty;
      calculatedRefund += subtotal;

      validatedItems.push({
        productId: reqItem.productId,
        name: reqItem.name,
        color: reqItem.color || match.color,
        size: reqItem.size || match.size,
        quantity: returnQty,
        unitPrice,
        subtotal,
        reason: reqItem.reason || dto.reason,
        exchangeColor: reqItem.exchangeColor,
        exchangeSize: reqItem.exchangeSize,
      });
    }

    const prefix = dto.requestType === 'exchange' ? 'EXC' : 'RET';
    const returnNumber = await this.getNextReturnNumber(prefix);

    const rawShipping = order.shippingAddress || {};
    const pickupAddress: ReturnPickupAddress = {
      fullName:
        dto.pickupAddress?.fullName ||
        order.customer?.fullName ||
        order.customer?.name ||
        'Customer',
      phone: dto.pickupAddress?.phone || order.customer?.phone || '',
      addressLine1:
        dto.pickupAddress?.addressLine1 || rawShipping.address || '',
      addressLine2: dto.pickupAddress?.addressLine2,
      city: dto.pickupAddress?.city || rawShipping.city || '',
      state: dto.pickupAddress?.state || rawShipping.state || '',
      postalCode:
        dto.pickupAddress?.postalCode || rawShipping.postalCode || '',
      country: dto.pickupAddress?.country || rawShipping.country || 'India',
    };

    const initialHistory: ReturnStatusHistoryEntry[] = [
      {
        status: 'Requested',
        note: `Customer submitted ${dto.requestType} request. Reason: ${dto.reason}`,
        at: new Date().toISOString(),
        by: 'Customer',
      },
    ];

    const bonusPercent = 5.0;
    const insertPayload = {
      return_number: returnNumber,
      order_id: order.id,
      order_number: order.orderId || order.id,
      user_id: userId || order.user || null,
      customer: {
        name: order.customer?.fullName || order.customer?.name || 'Customer',
        email: order.customer?.email || '',
        phone: order.customer?.phone || '',
      },
      request_type: dto.requestType,
      status: 'Requested',
      reason: dto.reason,
      customer_notes: dto.customerNotes || null,
      items: validatedItems,
      photos: dto.photos || [],
      refund_preference: dto.refundPreference || 'original_payment',
      store_credit_bonus_percent: bonusPercent,
      total_items_count: validatedItems.reduce((s, i) => s + i.quantity, 0),
      calculated_refund_amount: calculatedRefund,
      actual_refund_amount: calculatedRefund,
      restocking_fee: 0,
      pickup_address: pickupAddress,
      inspection_status: 'Pending',
      refund_status: 'Pending',
      status_history: initialHistory,
    };

    const { data: created, error } = await this.db
      .from('order_returns')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      this.logger.error(`Failed to create return record: ${error.message}`);
      throw new BadRequestException(error.message);
    }

    // Update order with return reference
    await this.db
      .from('orders')
      .update({
        return_status: 'Requested',
        return_id: created.id,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', order.id);

    return this.mapReturnRecord(created);
  }

  async getMyReturns(userId: string): Promise<OrderReturn[]> {
    const { data, error } = await this.db
      .from('order_returns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return (data || []).map((row) => this.mapReturnRecord(row));
  }

  async getReturnById(id: string, userId?: string, isAdmin = false): Promise<OrderReturn> {
    const { data, error } = await this.db
      .from('order_returns')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Return record not found.');

    if (!isAdmin && userId && data.user_id && data.user_id !== userId) {
      throw new ForbiddenException('Access denied to this return record.');
    }

    return this.mapReturnRecord(data);
  }

  async adminListReturns(query: {
    status?: string;
    requestType?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    let q = this.db
      .from('order_returns')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (query.status) {
      q = q.eq('status', query.status);
    }
    if (query.requestType) {
      q = q.eq('request_type', query.requestType);
    }
    if (query.search) {
      const term = query.search.trim();
      q = q.or(
        `return_number.ilike.%${term}%,order_number.ilike.%${term}%,customer->>email.ilike.%${term}%,customer->>name.ilike.%${term}%`,
      );
    }

    const limit = query.limit || 25;
    const offset = query.offset || 0;
    q = q.range(offset, offset + limit - 1);

    const { data, count, error } = await q;
    if (error) throw new BadRequestException(error.message);

    return {
      returns: (data || []).map((row) => this.mapReturnRecord(row)),
      total: count || 0,
    };
  }

  async adminApproveReturn(
    id: string,
    dto: AdminApproveReturnDto,
    adminEmail = 'Admin',
  ): Promise<OrderReturn> {
    const ret = await this.getReturnById(id, undefined, true);

    const historyEntry: ReturnStatusHistoryEntry = {
      status: 'Approved',
      note: dto.adminNotes || 'Return request approved by concierge.',
      at: new Date().toISOString(),
      by: adminEmail,
    };

    const nextHistory = [...(ret.statusHistory || []), historyEntry];

    const { data, error } = await this.db
      .from('order_returns')
      .update({
        status: 'Approved',
        admin_notes: dto.adminNotes || ret.adminNotes,
        pickup_courier: dto.pickupCourier || ret.pickupCourier || 'Lustre Express Logistics',
        status_history: nextHistory,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);

    await this.db
      .from('orders')
      .update({ return_status: 'Approved' })
      .eq('id', ret.orderId);

    return this.mapReturnRecord(data);
  }

  async adminSchedulePickup(
    id: string,
    dto: AdminSchedulePickupDto,
    adminEmail = 'Admin',
  ): Promise<OrderReturn> {
    const ret = await this.getReturnById(id, undefined, true);

    let trackingNumber = dto.trackingNumber;
    let courier = dto.courier || ret.pickupCourier || 'Delhivery Return Pickup';

    // Attempt automated reverse shipment booking via integrated carrier
    try {
      const returnShipment = await this.shippingService.createReturnShipment({
        orderId: ret.orderId,
        reason: ret.reason,
      });
      if (returnShipment) {
        if (!trackingNumber && returnShipment.tracking_number) {
          trackingNumber = returnShipment.tracking_number;
        }
        if (returnShipment.provider) {
          courier = returnShipment.provider
            .split('_')
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
        }
      }
    } catch (shippingErr) {
      this.logger.debug(
        `Carrier reverse shipment auto-booking skipped: ${
          shippingErr instanceof Error ? shippingErr.message : String(shippingErr)
        }`,
      );
    }

    if (!trackingNumber) {
      trackingNumber = `RET-AWB-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    }

    const historyEntry: ReturnStatusHistoryEntry = {
      status: 'Pickup scheduled',
      note: `Pickup scheduled with ${courier}. Waybill: ${trackingNumber}. Date: ${dto.scheduledDate || 'Next business day'}.`,
      at: new Date().toISOString(),
      by: adminEmail,
    };

    const nextHistory = [...(ret.statusHistory || []), historyEntry];

    const { data, error } = await this.db
      .from('order_returns')
      .update({
        status: 'Pickup scheduled',
        pickup_courier: courier,
        pickup_tracking_number: trackingNumber,
        pickup_scheduled_date: dto.scheduledDate || new Date().toISOString(),
        admin_notes: dto.notes || ret.adminNotes,
        status_history: nextHistory,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);

    await this.db
      .from('orders')
      .update({ return_status: 'Pickup scheduled' })
      .eq('id', ret.orderId);

    return this.mapReturnRecord(data);
  }

  async adminMarkReceived(id: string, adminEmail = 'Admin'): Promise<OrderReturn> {
    const ret = await this.getReturnById(id, undefined, true);

    const historyEntry: ReturnStatusHistoryEntry = {
      status: 'Received',
      note: 'Parcel received at verification warehouse. Queued for inspection.',
      at: new Date().toISOString(),
      by: adminEmail,
    };

    const nextHistory = [...(ret.statusHistory || []), historyEntry];

    const { data, error } = await this.db
      .from('order_returns')
      .update({
        status: 'Received',
        status_history: nextHistory,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);

    await this.db
      .from('orders')
      .update({ return_status: 'Received' })
      .eq('id', ret.orderId);

    return this.mapReturnRecord(data);
  }

  async adminInspectReturn(
    id: string,
    dto: AdminInspectReturnDto,
    adminEmail = 'Admin',
  ): Promise<OrderReturn> {
    const ret = await this.getReturnById(id, undefined, true);

    const restockingFee = Number(dto.restockingFee || 0);
    const actualRefund = Math.max(0, ret.calculatedRefundAmount - restockingFee);

    const historyEntry: ReturnStatusHistoryEntry = {
      status: 'Inspected',
      note: `Inspection ${dto.inspectionStatus}. Notes: ${dto.inspectionNotes || 'Item verified in good condition'}.${restockingFee > 0 ? ` Restocking deduction: ₹${restockingFee}.` : ''}`,
      at: new Date().toISOString(),
      by: adminEmail,
    };

    const nextHistory = [...(ret.statusHistory || []), historyEntry];

    const { data, error } = await this.db
      .from('order_returns')
      .update({
        status: 'Inspected',
        inspection_status: dto.inspectionStatus,
        inspection_notes: dto.inspectionNotes || null,
        restocking_fee: restockingFee,
        actual_refund_amount: actualRefund,
        status_history: nextHistory,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);

    await this.db
      .from('orders')
      .update({ return_status: 'Inspected' })
      .eq('id', ret.orderId);

    return this.mapReturnRecord(data);
  }

  async adminProcessRefund(
    id: string,
    dto: AdminProcessRefundDto,
    adminEmail = 'Admin',
  ): Promise<OrderReturn> {
    const ret = await this.getReturnById(id, undefined, true);

    const finalRefundAmount =
      dto.customRefundAmount !== undefined
        ? Number(dto.customRefundAmount)
        : Number(ret.actualRefundAmount || ret.calculatedRefundAmount || 0);

    const refundMethod =
      dto.refundMethod ||
      (ret.refundPreference === 'store_credit'
        ? 'Store Credit / Wallet'
        : 'Original Payment Source');

    const transactionId =
      dto.transactionId ||
      `REF-TXN-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // 1. If store credit chosen, credit loyalty points or wallet balance directly
    if (ret.refundPreference === 'store_credit' && ret.userId) {
      const bonus = Number(ret.storeCreditBonusPercent || 5);
      const totalCredited = finalRefundAmount + (finalRefundAmount * bonus) / 100;
      const pointsToAward = Math.round(totalCredited);

      try {
        await this.loyaltyService.adminAdjustPoints({
          userId: ret.userId,
          points: pointsToAward,
          description: `Store credit refund for Return ${ret.returnNumber} (Includes ${bonus}% bonus)`,
        });
      } catch (err) {
        this.logger.warn(`Could not award store credit points: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 2. Restock inspected products into inventory
    if (ret.inspectionStatus === 'Passed' || ret.inspectionStatus === 'Partially Approved') {
      for (const item of ret.items || []) {
        try {
          await this.db.rpc('release_product_stock', {
            p_id: item.productId,
            p_qty: item.quantity,
          });
        } catch {
          // If RPC is unavailable, update product stock directly
          const { data: prod } = await this.db
            .from('products')
            .select('stock')
            .eq('id', item.productId)
            .maybeSingle();

          if (prod) {
            await this.db
              .from('products')
              .update({ stock: (prod.stock || 0) + item.quantity })
              .eq('id', item.productId);
          }
        }
      }
    }

    // 3. Generate GST Credit Note and Refund Receipt
    let creditNoteNumber: string | null = null;
    try {
      const cn = await this.documentsService.generateCreditNote(ret.id);
      creditNoteNumber = cn.creditNoteNumber;
    } catch (docErr) {
      this.logger.warn(`Could not generate credit note: ${docErr instanceof Error ? docErr.message : String(docErr)}`);
    }

    const historyEntry: ReturnStatusHistoryEntry = {
      status: 'Completed',
      note: `Refund of ₹${finalRefundAmount.toFixed(2)} completed via ${refundMethod}. Ref: ${transactionId}.${creditNoteNumber ? ` Credit Note: ${creditNoteNumber}.` : ''}`,
      at: new Date().toISOString(),
      by: adminEmail,
    };

    const nextHistory = [...(ret.statusHistory || []), historyEntry];

    const { data, error } = await this.db
      .from('order_returns')
      .update({
        status: 'Completed',
        refund_status: 'Completed',
        refund_method: refundMethod,
        refund_transaction_id: transactionId,
        actual_refund_amount: finalRefundAmount,
        credit_note_number: creditNoteNumber,
        status_history: nextHistory,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);

    await this.db
      .from('orders')
      .update({ return_status: 'Completed' })
      .eq('id', ret.orderId);

    return this.mapReturnRecord(data);
  }

  async adminCompleteExchange(
    id: string,
    dto: AdminCompleteExchangeDto,
    adminEmail = 'Admin',
  ): Promise<OrderReturn> {
    const ret = await this.getReturnById(id, undefined, true);

    const exchangeOrderNumber =
      dto.exchangeOrderNumber || `EXC-ORD-${ret.orderNumber}`;

    const historyEntry: ReturnStatusHistoryEntry = {
      status: 'Completed',
      note: `Exchange fulfilled with replacement order ${exchangeOrderNumber}.`,
      at: new Date().toISOString(),
      by: adminEmail,
    };

    const nextHistory = [...(ret.statusHistory || []), historyEntry];

    const { data, error } = await this.db
      .from('order_returns')
      .update({
        status: 'Completed',
        exchange_order_number: exchangeOrderNumber,
        status_history: nextHistory,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);

    await this.db
      .from('orders')
      .update({ return_status: 'Exchange Completed' })
      .eq('id', ret.orderId);

    return this.mapReturnRecord(data);
  }

  async adminRejectReturn(
    id: string,
    dto: AdminRejectReturnDto,
    adminEmail = 'Admin',
  ): Promise<OrderReturn> {
    const ret = await this.getReturnById(id, undefined, true);

    const historyEntry: ReturnStatusHistoryEntry = {
      status: 'Rejected',
      note: `Return request rejected. Reason: ${dto.rejectionReason}`,
      at: new Date().toISOString(),
      by: adminEmail,
    };

    const nextHistory = [...(ret.statusHistory || []), historyEntry];

    const { data, error } = await this.db
      .from('order_returns')
      .update({
        status: 'Rejected',
        rejection_reason: dto.rejectionReason,
        admin_notes: dto.adminNotes || ret.adminNotes,
        status_history: nextHistory,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);

    await this.db
      .from('orders')
      .update({ return_status: 'Rejected' })
      .eq('id', ret.orderId);

    return this.mapReturnRecord(data);
  }

  async cancelReturn(id: string, userId?: string): Promise<OrderReturn> {
    const ret = await this.getReturnById(id, userId, false);

    if (ret.status !== 'Requested') {
      throw new BadRequestException('Return request cannot be cancelled once approved or in pickup transit.');
    }

    const historyEntry: ReturnStatusHistoryEntry = {
      status: 'Cancelled',
      note: 'Customer cancelled the return request.',
      at: new Date().toISOString(),
      by: 'Customer',
    };

    const nextHistory = [...(ret.statusHistory || []), historyEntry];

    const { data, error } = await this.db
      .from('order_returns')
      .update({
        status: 'Cancelled',
        status_history: nextHistory,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);

    await this.db
      .from('orders')
      .update({ return_status: null, return_id: null })
      .eq('id', ret.orderId);

    return this.mapReturnRecord(data);
  }

  private mapReturnRecord(row: any): OrderReturn {
    return {
      id: row.id,
      returnNumber: row.return_number,
      orderId: row.order_id,
      orderNumber: row.order_number,
      userId: row.user_id,
      customer: row.customer || {},
      requestType: row.request_type,
      status: row.status,
      reason: row.reason,
      customerNotes: row.customer_notes,
      items: row.items || [],
      photos: row.photos || [],
      refundPreference: row.refund_preference,
      storeCreditBonusPercent: Number(row.store_credit_bonus_percent || 5),
      totalItemsCount: Number(row.total_items_count || 1),
      calculatedRefundAmount: Number(row.calculated_refund_amount || 0),
      actualRefundAmount: Number(row.actual_refund_amount || 0),
      restockingFee: Number(row.restocking_fee || 0),
      pickupAddress: row.pickup_address || {},
      pickupCourier: row.pickup_courier,
      pickupTrackingNumber: row.pickup_tracking_number,
      pickupScheduledDate: row.pickup_scheduled_date,
      adminNotes: row.admin_notes,
      rejectionReason: row.rejection_reason,
      inspectionStatus: row.inspection_status || 'Pending',
      inspectionNotes: row.inspection_notes,
      refundStatus: row.refund_status || 'Pending',
      refundMethod: row.refund_method,
      refundTransactionId: row.refund_transaction_id,
      exchangeItemDetails: row.exchange_item_details || {},
      exchangeOrderId: row.exchange_order_id,
      exchangeOrderNumber: row.exchange_order_number,
      creditNoteId: row.credit_note_id,
      creditNoteNumber: row.credit_note_number,
      statusHistory: row.status_history || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      resolvedAt: row.resolved_at,
    };
  }
}
