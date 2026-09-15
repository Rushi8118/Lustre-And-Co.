import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CouponDocument = Coupon & Document;

@Schema({ timestamps: true })
export class Coupon {
  @Prop({ type: String, required: true, unique: true, uppercase: true })
  code: string;

  @Prop({ type: String, required: true, enum: ['percentage', 'fixed', 'free_shipping'] })
  type: string;

  /** 0.10 for 10% (percentage), rupee amount (fixed), ignored for free_shipping. */
  @Prop({ type: Number, required: true })
  value: number;

  @Prop({ type: String, default: '' })
  description: string;

  @Prop({ type: Number, default: 0 })
  minOrderAmount: number;

  /** Maximum redemptions across all customers; 0 means unlimited. */
  @Prop({ type: Number, default: 0 })
  usageLimit: number;

  @Prop({ type: Number, default: 0 })
  usedCount: number;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Date, required: false })
  expiresAt?: Date;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
