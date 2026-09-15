import { Controller, Post, Body, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DiscountsService } from './discounts.service.js';
import { ValidateCouponDto } from './dto/validate-coupon.dto.js';

@ApiTags('Discounts')
@Controller('discounts')
export class DiscountsController {
  constructor(@Inject(DiscountsService) private readonly discountsService: DiscountsService) {}

  @Post('validate')
  @ApiOperation({ summary: 'Validate promo code and calculate discount' })
  @ApiResponse({ status: 200, description: 'Coupon is valid, returns discount amount and rules.' })
  @ApiResponse({ status: 400, description: 'Invalid, expired, or minimum amount not met.' })
  async validateCoupon(@Body() dto: ValidateCouponDto) {
    return this.discountsService.validateCoupon(dto.code, dto.subtotal);
  }
}
