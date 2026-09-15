import { Controller, Get, Post, Param, UseGuards, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { UserDocument } from '../users/schemas/user.schema.js';

@ApiTags('Wishlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(@Inject(WishlistService) private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: "Get current customer's saved wishlist items" })
  @ApiResponse({ status: 200, description: 'Wishlist items retrieved successfully.' })
  async getWishlist(@CurrentUser() user: UserDocument) {
    return this.wishlistService.getWishlist(user._id);
  }

  @Post(':productId')
  @ApiOperation({ summary: 'Toggle an item in or out of wishlist' })
  @ApiResponse({ status: 200, description: 'Wishlist toggled successfully.' })
  async toggleWishlist(
    @CurrentUser() user: UserDocument,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.toggleWishlist(user._id, productId);
  }
}
