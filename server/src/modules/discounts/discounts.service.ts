import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service.js';
import { unwrap } from '../../common/utils/db.js';

@Injectable()
export class DiscountsService {
  constructor(@Inject(SupabaseService) private readonly db: SupabaseService) {}

  async validateCoupon(code: string, subtotal: number = 0) {
    const normalized = (code || '').trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('Please enter a promo code.');
    }

    const coupon = unwrap(await this.db.from('coupons').select('*').eq('code', normalized).maybeSingle());
    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('This promo code is invalid or no longer active.');
    }

    if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
      throw new BadRequestException(`Promo code ${coupon.code} has expired.`);
    }

    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException(`Promo code ${coupon.code} has reached its usage limit.`);
    }

    const minOrderAmount = Number(coupon.minOrderAmount || 0);
    const value = Number(coupon.value);

    if (minOrderAmount && subtotal < minOrderAmount) {
      throw new BadRequestException(
        `Code ${coupon.code} requires a minimum order subtotal of ₹${minOrderAmount.toLocaleString('en-IN')}.`,
      );
    }

    let discountAmount = 0;
    let label = '';
    const isFreeShipping = coupon.type === 'free_shipping';

    if (coupon.type === 'percentage') {
      discountAmount = Math.round(subtotal * value);
      label = `${Math.round(value * 100)}% OFF`;
    } else if (coupon.type === 'fixed') {
      discountAmount = Math.min(subtotal, value);
      label = `₹${value} OFF`;
    } else if (isFreeShipping) {
      label = 'Free Delivery';
    }

    return {
      valid: true,
      code: coupon.code,
      rate: value,
      type: coupon.type,
      minOrderAmount,
      freeShipping: isFreeShipping,
      discountAmount,
      label,
      message: isFreeShipping
        ? 'Free shipping applied to your order!'
        : `${label} applied successfully!`,
    };
  }

  async incrementUsage(code: string) {
    await this.db.rpc('increment_coupon_usage', { p_code: code });
  }
}
