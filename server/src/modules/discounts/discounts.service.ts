import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Coupon, CouponDocument } from './schemas/coupon.schema.js';

@Injectable()
export class DiscountsService {
  constructor(
    @InjectModel(Coupon.name) private readonly couponModel: Model<CouponDocument>,
  ) {}

  async validateCoupon(code: string, subtotal: number = 0) {
    const normalized = (code || '').trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('Please enter a promo code.');
    }

    const coupon = await this.couponModel.findOne({ code: normalized }).exec();
    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('This promo code is invalid or no longer active.');
    }

    if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
      throw new BadRequestException(`Promo code ${coupon.code} has expired.`);
    }

    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException(`Promo code ${coupon.code} has reached its usage limit.`);
    }

    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
      throw new BadRequestException(
        `Code ${coupon.code} requires a minimum order subtotal of ₹${coupon.minOrderAmount.toLocaleString('en-IN')}.`,
      );
    }

    let discountAmount = 0;
    let label = '';
    const isFreeShipping = coupon.type === 'free_shipping';

    if (coupon.type === 'percentage') {
      discountAmount = Math.round(subtotal * coupon.value);
      label = `${Math.round(coupon.value * 100)}% OFF`;
    } else if (coupon.type === 'fixed') {
      discountAmount = Math.min(subtotal, coupon.value);
      label = `₹${coupon.value} OFF`;
    } else if (isFreeShipping) {
      label = 'Free Delivery';
    }

    return {
      valid: true,
      code: coupon.code,
      rate: coupon.value,
      type: coupon.type,
      minOrderAmount: coupon.minOrderAmount,
      freeShipping: isFreeShipping,
      discountAmount,
      label,
      message: isFreeShipping
        ? 'Free shipping applied to your order!'
        : `${label} applied successfully!`,
    };
  }

  async incrementUsage(code: string) {
    await this.couponModel.updateOne({ code: code.toUpperCase() }, { $inc: { usedCount: 1 } }).exec();
  }
}
