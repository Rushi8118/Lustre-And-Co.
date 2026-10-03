import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Inject,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { CartService } from './cart.service.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';
import { AddBundleToCartDto } from './dto/add-bundle-to-cart.dto.js';
import { SyncCartDto } from './dto/sync-cart.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { UserDocument } from '../users/schemas/user.schema.js';

export class SetCartEmailDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  customerName?: string;
}

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(@Inject(CartService) private readonly cartService: CartService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get current user's shopping bag" })
  async getCart(@CurrentUser() user: UserDocument) {
    return this.cartService.getCart(user._id);
  }

  @Post('sync')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Merge guest localStorage items into the account bag upon login' })
  async syncCart(@CurrentUser() user: UserDocument, @Body() dto: SyncCartDto) {
    return this.cartService.syncCart(user._id, dto);
  }

  @Post('items')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Add an item (or more of an existing item) to the bag' })
  @ApiResponse({ status: 400, description: 'Not enough stock.' })
  async addItem(@CurrentUser() user: UserDocument, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(user._id, dto);
  }

  @Patch('items/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Set the quantity of a bag item' })
  async updateItem(
    @CurrentUser() user: UserDocument,
    @Param('id') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItemQuantity(user._id, itemId, dto.quantity);
  }

  @Delete('items/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove an item from the bag' })
  async removeItem(@CurrentUser() user: UserDocument, @Param('id') itemId: string) {
    return this.cartService.removeItem(user._id, itemId);
  }

  @Delete()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Empty the bag' })
  async clearCart(@CurrentUser() user: UserDocument) {
    return this.cartService.clearCart(user._id);
  }

  @Put(':cartId/recovery-email')
  @ApiOperation({ summary: 'Save recovery email for a cart' })
  setRecoveryEmail(
    @Param('cartId') cartId: string,
    @Body() dto: SetCartEmailDto,
  ) {
    return this.cartService.setRecoveryEmail(
      cartId,
      dto.email,
      dto.customerName,
    );
  }

  @Post(':cartId/bundles')
  @ApiOperation({ summary: 'Add a bundle to the cart' })
  addBundleToCart(
    @Param('cartId') cartId: string,
    @Body() dto: AddBundleToCartDto,
  ) {
    return this.cartService.addBundleToCart(cartId, dto);
  }

  @Delete(':cartId/bundles/:bundleId')
  @ApiOperation({ summary: 'Remove a bundle from the cart' })
  removeBundleFromCart(
    @Param('cartId') cartId: string,
    @Param('bundleId') bundleId: string,
  ) {
    return this.cartService.removeBundleFromCart(cartId, bundleId);
  }

  @Post(':cartId/bundles/validate')
  @ApiOperation({ summary: 'Validate all bundles in the cart' })
  validateCartBundles(@Param('cartId') cartId: string) {
    return this.cartService.validateCartBundles(cartId);
  }
}
