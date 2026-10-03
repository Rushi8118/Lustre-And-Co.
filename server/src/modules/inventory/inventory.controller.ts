import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AdminOnly } from '../../common/decorators/admin-only.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto.js';
import { CommitReservationDto } from './dto/commit-reservation.dto.js';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto.js';
import { CreateSupplierDto } from './dto/create-supplier.dto.js';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto.js';
import { ReleaseReservationDto } from './dto/release-reservation.dto.js';
import { ReserveInventoryDto } from './dto/reserve-inventory.dto.js';
import { UpdateProductInventoryDto } from './dto/update-product-inventory.dto.js';
import { InventoryService } from './inventory.service.js';

@ApiTags('Inventory')
@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ─── Checkout Reservation Endpoints (authenticated checkout flow) ─────────

  @Post('inventory/reservations')
  @ApiOperation({ summary: 'Reserve stock for checkout (server-authoritative)' })
  reserveInventory(@Body() dto: ReserveInventoryDto) {
    return this.inventoryService.reserveInventory(dto);
  }

  @Post('inventory/reservations/:token/release')
  @ApiOperation({ summary: 'Release a checkout reservation' })
  releaseReservation(
    @Param('token') token: string,
    @Body() dto: ReleaseReservationDto,
  ) {
    return this.inventoryService.releaseReservation(token, dto);
  }

  @Post('inventory/reservations/:token/commit')
  @ApiOperation({ summary: 'Commit a reservation after payment verification' })
  commitReservation(
    @Param('token') token: string,
    @Body() dto: CommitReservationDto,
  ) {
    return this.inventoryService.commitReservation(token, dto);
  }

  // ─── Admin: Product Inventory ─────────────────────────────────────────────

  @AdminOnly()
  @Get('admin/inventory')
  listInventory(
    @Query('search') search?: string,
    @Query('lowStock') lowStock?: string,
    @Query('outOfStock') outOfStock?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.listInventory({
      search,
      lowStock: lowStock === 'true',
      outOfStock: outOfStock === 'true',
      page: Number(page || 1),
      limit: Number(limit || 30),
    });
  }

  @AdminOnly()
  @Get('admin/inventory/export.csv')
  async exportInventory(@Res() res: Response) {
    const csv = await this.inventoryService.exportInventoryCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="inventory-export.csv"');
    res.send(csv);
  }

  @AdminOnly()
  @Get('admin/inventory/:productId')
  getProductInventory(@Param('productId') productId: string) {
    return this.inventoryService.getProductInventory(productId);
  }

  @AdminOnly()
  @Put('admin/inventory/:productId')
  updateProductInventory(
    @Param('productId') productId: string,
    @Body() dto: UpdateProductInventoryDto,
  ) {
    return this.inventoryService.updateProductInventory(productId, dto);
  }

  @AdminOnly()
  @Post('admin/inventory/adjust')
  adjustInventory(@Body() dto: AdjustInventoryDto, @CurrentUser() user?: any) {
    return this.inventoryService.adjustInventory(dto, user?.id);
  }

  // ─── Admin: Movements ────────────────────────────────────────────────────

  @AdminOnly()
  @Get('admin/inventory-movements')
  getMovements(
    @Query('productId') productId?: string,
    @Query('movementType') movementType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.getMovements({
      productId,
      movementType,
      page: Number(page || 1),
      limit: Number(limit || 50),
    });
  }

  // ─── Admin: Alerts ───────────────────────────────────────────────────────

  @AdminOnly()
  @Get('admin/inventory-alerts')
  getAlerts(@Query('status') status?: string, @Query('alertType') alertType?: string) {
    return this.inventoryService.getAlerts({ status, alertType });
  }

  @AdminOnly()
  @Post('admin/inventory-alerts/:id/acknowledge')
  acknowledgeAlert(@Param('id') id: string) {
    return this.inventoryService.acknowledgeAlert(id);
  }

  @AdminOnly()
  @Post('admin/inventory-alerts/refresh')
  refreshAlerts() {
    return this.inventoryService.refreshAllAlerts();
  }

  // ─── Admin: Suppliers ────────────────────────────────────────────────────

  @AdminOnly()
  @Get('admin/suppliers')
  listSuppliers() {
    return this.inventoryService.listSuppliers();
  }

  @AdminOnly()
  @Post('admin/suppliers')
  createSupplier(@Body() dto: CreateSupplierDto) {
    return this.inventoryService.createSupplier(dto);
  }

  // ─── Admin: Purchase Orders ──────────────────────────────────────────────

  @AdminOnly()
  @Get('admin/purchase-orders')
  listPurchaseOrders() {
    return this.inventoryService.listPurchaseOrders();
  }

  @AdminOnly()
  @Get('admin/purchase-orders/:id')
  getPurchaseOrder(@Param('id') id: string) {
    return this.inventoryService.getPurchaseOrder(id);
  }

  @AdminOnly()
  @Post('admin/purchase-orders')
  createPurchaseOrder(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user?: any) {
    return this.inventoryService.createPurchaseOrder(dto, user?.id);
  }

  @AdminOnly()
  @Post('admin/purchase-orders/:id/receive')
  receivePurchaseOrder(
    @Param('id') id: string,
    @Body() dto: ReceivePurchaseOrderDto,
    @CurrentUser() user?: any,
  ) {
    return this.inventoryService.receivePurchaseOrder(id, dto, user?.id);
  }
}
