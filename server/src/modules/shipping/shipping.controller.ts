import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../../common/decorators/admin-only.decorator.js';
import { CalculateShippingRateDto } from './dto/calculate-shipping-rate.dto.js';
import { CreateReturnShipmentDto } from './dto/create-return-shipment.dto.js';
import { CreateShipmentDto } from './dto/create-shipment.dto.js';
import { UpdateShippingSettingsDto } from './dto/update-shipping-settings.dto.js';
import { ShippingService } from './shipping.service.js';
import type { ShippingProviderName } from './schemas/shipping.schema.js';

@ApiTags('Shipping')
@Controller()
export class ShippingController {
  constructor(
    private readonly shippingService: ShippingService,
  ) {}

  @Post('shipping/rates')
  @ApiOperation({ summary: 'Calculate available shipping rates' })
  calculateRates(@Body() dto: CalculateShippingRateDto) {
    return this.shippingService.calculateRates(dto);
  }

  @Get('shipping/serviceability')
  @ApiOperation({ summary: 'Check provider pincode serviceability' })
  checkServiceability(
    @Query('provider') provider: ShippingProviderName,
    @Query('originPincode') originPincode: string,
    @Query('destinationPincode') destinationPincode: string,
  ) {
    return this.shippingService.checkServiceability(
      provider,
      originPincode,
      destinationPincode,
    );
  }

  @Get('shipping/providers')
  @ApiOperation({ summary: 'List supported shipping providers' })
  listProviders() {
    return this.shippingService.listProviders();
  }

  @Get('shipping/orders/:orderId/shipments')
  @ApiOperation({ summary: 'Customer tracking for order shipments' })
  getPublicOrderShipments(@Param('orderId') orderId: string) {
    return this.shippingService.getOrderShipments(orderId);
  }

  @AdminOnly()
  @Get('admin/shipping/shipments')
  @ApiOperation({ summary: 'Admin list all shipments' })
  listShipments(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.shippingService.listShipments({
      status,
      search,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @AdminOnly()
  @Post('admin/shipping/sync')
  @ApiOperation({ summary: 'Admin trigger tracking synchronization for active shipments' })
  syncActiveShipments() {
    return this.shippingService.synchronizeActiveShipments();
  }

  @AdminOnly()
  @Post('admin/shipping/shipments')
  @ApiOperation({ summary: 'Admin create shipment' })
  createShipment(@Body() dto: CreateShipmentDto) {
    return this.shippingService.createShipment(dto);
  }

  @AdminOnly()
  @Get('admin/shipping/shipments/:id')
  @ApiOperation({ summary: 'Admin get shipment details' })
  getShipment(@Param('id') id: string) {
    return this.shippingService.getShipment(id);
  }

  @AdminOnly()
  @Get('admin/orders/:orderId/shipments')
  @ApiOperation({ summary: 'Admin get order shipments' })
  getOrderShipments(@Param('orderId') orderId: string) {
    return this.shippingService.getOrderShipments(orderId);
  }

  @AdminOnly()
  @Post('admin/shipping/shipments/:id/track')
  @ApiOperation({ summary: 'Admin trigger tracking sync for shipment' })
  trackShipment(@Param('id') id: string) {
    return this.shippingService.trackShipment(id);
  }

  @AdminOnly()
  @Post('admin/shipping/shipments/:id/cancel')
  @ApiOperation({ summary: 'Admin cancel shipment' })
  cancelShipment(@Param('id') id: string) {
    return this.shippingService.cancelShipment(id);
  }

  @AdminOnly()
  @Post('admin/shipping/returns')
  @ApiOperation({ summary: 'Admin create return shipment' })
  createReturnShipment(
    @Body() dto: CreateReturnShipmentDto,
  ) {
    return this.shippingService.createReturnShipment(dto);
  }

  @Post('shipping/webhooks/:provider')
  @ApiOperation({ summary: 'Shipping provider webhook endpoint' })
  handleWebhook(
    @Param('provider') provider: ShippingProviderName,
    @Body() payload: any,
    @Headers('x-shipping-signature') signature?: string,
  ) {
    return this.shippingService.handleWebhook(
      provider,
      payload,
      signature,
    );
  }

  @AdminOnly()
  @Get('admin/shipping/settings')
  @ApiOperation({ summary: 'Get shipping configuration settings' })
  getSettings() {
    return this.shippingService.getSettings();
  }

  @AdminOnly()
  @Put('admin/shipping/settings')
  @ApiOperation({ summary: 'Update shipping configuration settings' })
  updateSettings(@Body() dto: UpdateShippingSettingsDto) {
    return this.shippingService.updateSettings(dto);
  }
}
