import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Order', required: true, index: true })
  order: Types.ObjectId;

  @Prop({ type: String, required: true, unique: true, index: true })
  orderId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  user?: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  amount: number;

  @Prop({ type: String, default: 'INR' })
  currency: string;

  @Prop({ type: String, required: true, enum: ['card', 'wallet', 'cod', 'netbanking', 'razorpay'] })
  method: string;

  @Prop({ type: String, required: true, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' })
  status: string;

  @Prop({ type: String }) transactionId?: string;
  @Prop({ type: String }) razorpayOrderId?: string;
  @Prop({ type: String }) razorpayPaymentId?: string;
  @Prop({ type: String }) razorpaySignature?: string;
  @Prop({ type: Date }) paidAt?: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);