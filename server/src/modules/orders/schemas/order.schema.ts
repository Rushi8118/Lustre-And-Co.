import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type OrderDocument = Order & Document;

export const ORDER_STATUSES = ['Confirmed', 'Processing', 'In Transit', 'Delivered', 'Cancelled'];

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: String, required: true, unique: true, index: true })
  orderId: string; // e.g. 'LST-89421056'

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false, index: true })
  user?: Types.ObjectId;

  @Prop({ type: Object, required: true })
  customer: {
    fullName: string;
    email: string;
    phone: string;
  };

  @Prop({ type: Object, required: true })
  shippingAddress: {
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };

  @Prop({ type: [Object], required: true })
  items: Array<{
    productId: string;
    slug?: string;
    name: string;
    price: number;
    quantity: number;
    color: string;
    size: string;
    image: string;
  }>;

  @Prop({ type: Number, required: true }) subtotal: number;
  @Prop({ type: Number, default: 0 }) discount: number;
  @Prop({ type: String }) promoCode?: string;
  @Prop({ type: Number, default: 0 }) shippingFee: number;
  @Prop({ type: Number, default: 0 }) deliverySurcharge: number;
  @Prop({ type: Number, default: 0 }) tax: number;
  @Prop({ type: Number, required: true }) total: number;

  @Prop({ type: String, enum: ['standard', 'express'], default: 'standard' })
  deliveryOption: string;

  @Prop({ type: String, default: '' }) notes: string;

  @Prop({ type: String, default: 'Confirmed', enum: ORDER_STATUSES })
  status: string;

  @Prop({ type: [Object], default: [] })
  statusHistory: Array<{ status: string; note?: string; at: Date }>;

  @Prop({ type: Object, default: { method: 'cod', status: 'pending' } })
  payment: {
    method: string;
    status: string;
    transactionId?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    paidAt?: Date;
  };

  @Prop({ type: String, default: 'Bluedart Air Express' }) carrier: string;
  @Prop({ type: String }) trackingNumber?: string;
  @Prop({ type: String }) estimatedDeliveryDate: string;

  /** Set once stock has been returned to inventory for a cancelled order. */
  @Prop({ type: Boolean, default: false }) stockRestored: boolean;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ 'customer.email': 1 });
OrderSchema.index({ createdAt: -1 });
