import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { UserDocument } from '../users/schemas/user.schema.js';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(@Inject(OrdersService) private readonly ordersService: OrdersService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Place an order (guest, or linked to the signed-in account)' })
  @ApiResponse({ status: 201, description: 'Order placed with server-side price calculation.' })
  @ApiResponse({ status: 400, description: 'Empty bag, unavailable item, or insufficient stock.' })
  async createOrder(@Body() dto: CreateOrderDto, @CurrentUser() user?: UserDocument) {
    return this.ordersService.createOrder(dto, user?._id as any);
  }

  @Get('my-orders')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List orders for the signed-in customer' })
  async getMyOrders(@CurrentUser() user: UserDocument) {
    return this.ordersService.getMyOrders(user._id);
  }

  @Get('track')
  @ApiOperation({ summary: 'Public order tracking lookup by Order ID and customer email' })
  @ApiQuery({ name: 'orderId', example: 'LST-89421056' })
  @ApiQuery({ name: 'email', example: 'eleanor@example.com' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async trackOrder(@Query('orderId') orderId: string, @Query('email') email: string) {
    return this.ordersService.trackOrder(orderId, email);
  }

  @Get(':orderId')
  @ApiBearerAuth()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Order details for its owner, an admin, or a matching ?email=' })
  @ApiQuery({ name: 'email', required: false })
  @ApiResponse({ status: 404, description: 'Order not found or not accessible.' })
  async getOrderById(
    @Param('orderId') orderId: string,
    @Query('email') email: string | undefined,
    @CurrentUser() user?: UserDocument,
  ) {
    return this.ordersService.getOrderForViewer(orderId, user, email);
  }
}
