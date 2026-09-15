import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AdminService } from './admin.service.js';
import { AdminCreateProductDto } from './dto/create-product.dto.js';
import { AdminUpdateProductDto } from './dto/update-product.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { AdminCreateDiscountDto } from './dto/create-discount.dto.js';
import { AdminUpdateDiscountDto } from './dto/update-discount.dto.js';
import { AdminFilterOrdersDto } from './dto/filter-orders.dto.js';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto.js';
import {
  AdminCreateUserDto,
  AdminDashboardQueryDto,
  AdminFilterCustomersDto,
  AdminFilterPaymentsDto,
  AdminUpdateUserDto,
} from './dto/customer.dto.js';
import { AdminOnly } from '../../common/decorators/admin-only.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { UserDocument } from '../users/schemas/user.schema.js';

@ApiTags('Admin')
@AdminOnly()
@Controller('admin')
export class AdminController {
  constructor(@Inject(AdminService) private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Revenue, orders, customers, trend, and items needing attention for a period' })
  getDashboard(@Query() query: AdminDashboardQueryDto) {
    return this.adminService.getDashboardMetrics(query.days || 7);
  }

  // Products
  @Get('products')
  @ApiOperation({ summary: 'List all products, including hidden ones' })
  getProducts(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getProducts(search, category, status);
  }

  @Get('products/:id')
  @ApiParam({ name: 'id', description: 'Product slug or id' })
  getProduct(@Param('id') id: string) {
    return this.adminService.getProduct(id);
  }

  @Post('products')
  @ApiResponse({ status: 201, description: 'Product created.' })
  createProduct(@Body() dto: AdminCreateProductDto) {
    return this.adminService.createProduct(dto);
  }

  @Put('products/:id')
  @ApiParam({ name: 'id', description: 'Product slug or id' })
  updateProduct(@Param('id') id: string, @Body() dto: AdminUpdateProductDto) {
    return this.adminService.updateProduct(id, dto);
  }

  @Delete('products/:id')
  @ApiParam({ name: 'id', description: 'Product slug or id' })
  deleteProduct(@Param('id') id: string) {
    return this.adminService.deleteProduct(id);
  }

  // Orders
  @Get('orders')
  @ApiOperation({ summary: 'List orders with status/payment filters, search, and pagination' })
  getOrders(@Query() dto: AdminFilterOrdersDto) {
    return this.adminService.getOrders(dto);
  }

  @Get('orders/:id')
  @ApiParam({ name: 'id', description: 'Order ID (e.g. LST-89421056) or id' })
  getOrder(@Param('id') id: string) {
    return this.adminService.getOrder(id);
  }

  @Patch('orders/:id/status')
  @ApiOperation({ summary: 'Move an order through fulfilment; cancelling restocks items' })
  updateOrderStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.adminService.updateOrderStatus(id, dto);
  }

  @Patch('orders/:id/payment')
  @ApiOperation({ summary: 'Manually set payment status (e.g. refunded)' })
  updatePaymentStatus(@Param('id') id: string, @Body() dto: UpdatePaymentStatusDto) {
    return this.adminService.updatePaymentStatus(id, dto.status);
  }

  // Discounts
  @Get('discounts')
  getDiscounts() {
    return this.adminService.getDiscounts();
  }

  @Post('discounts')
  @ApiResponse({ status: 409, description: 'Coupon code already exists.' })
  createDiscount(@Body() dto: AdminCreateDiscountDto) {
    return this.adminService.createDiscount(dto);
  }

  @Put('discounts/:id')
  @ApiParam({ name: 'id', description: 'Coupon code or id' })
  updateDiscount(@Param('id') id: string, @Body() dto: AdminUpdateDiscountDto) {
    return this.adminService.updateDiscount(id, dto);
  }

  @Delete('discounts/:id')
  @ApiParam({ name: 'id', description: 'Coupon code or id' })
  deleteDiscount(@Param('id') id: string) {
    return this.adminService.deleteDiscount(id);
  }

  // Customers & staff
  @Get('customers')
  getCustomers(@Query() dto: AdminFilterCustomersDto) {
    return this.adminService.getCustomers(dto);
  }

  @Get('customers/:id')
  getCustomer(@Param('id') id: string) {
    return this.adminService.getCustomer(id);
  }

  @Post('customers')
  @ApiOperation({ summary: 'Create a customer or admin account' })
  createUser(@Body() dto: AdminCreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Patch('customers/:id')
  @ApiOperation({ summary: 'Update role, status, profile, or password of an account' })
  updateUser(@Param('id') id: string, @Body() dto: AdminUpdateUserDto, @CurrentUser() admin: UserDocument) {
    return this.adminService.updateUser(id, dto, admin._id.toString());
  }

  @Delete('customers/:id')
  deleteUser(@Param('id') id: string, @CurrentUser() admin: UserDocument) {
    return this.adminService.deleteUser(id, admin._id.toString());
  }

  // Payments
  @Get('payments')
  @ApiOperation({ summary: 'Payment ledger with totals by status' })
  getPayments(@Query() dto: AdminFilterPaymentsDto) {
    return this.adminService.getPayments(dto);
  }
}
