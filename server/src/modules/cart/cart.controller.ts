import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Inject,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';
import { SyncCartDto } from './dto/sync-cart.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { UserDocument } from '../users/schemas/user.schema.js';

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(@Inject(CartService) private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: "Get current user's shopping bag" })
  async getCart(@CurrentUser() user: UserDocument) {
    return this.cartService.getCart(user._id);
  }

  @Post('sync')
  @HttpCode(200)
  @ApiOperation({ summary: 'Merge guest localStorage items into the account bag upon login' })
  async syncCart(@CurrentUser() user: UserDocument, @Body() dto: SyncCartDto) {
    return this.cartService.syncCart(user._id, dto);
  }

  @Post('items')
  @HttpCode(200)
  @ApiOperation({ summary: 'Add an item (or more of an existing item) to the bag' })
  @ApiResponse({ status: 400, description: 'Not enough stock.' })
  async addItem(@CurrentUser() user: UserDocument, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(user._id, dto);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Set the quantity of a bag item' })
  async updateItem(
    @CurrentUser() user: UserDocument,
    @Param('id') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItemQuantity(user._id, itemId, dto.quantity);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Remove an item from the bag' })
  async removeItem(@CurrentUser() user: UserDocument, @Param('id') itemId: string) {
    return this.cartService.removeItem(user._id, itemId);
  }

  @Delete()
  @ApiOperation({ summary: 'Empty the bag' })
  async clearCart(@CurrentUser() user: UserDocument) {
    return this.cartService.clearCart(user._id);
  }
}
