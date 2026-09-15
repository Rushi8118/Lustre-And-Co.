import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';
import { Product } from '../../products/schemas/product.schema.js';

export type CartDocument = Cart & Document;

@Schema()
export class CartItem {
  @Prop({ type: String, required: true })
  id: string; // compositeId, e.g. 'aurora-gold-plated-necklace-gold'

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Product.name, required: true })
  product: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, default: 1 })
  quantity: number;

  @Prop({ type: String, default: 'Gold' })
  selectedColor: string;

  @Prop({ type: String, default: 'Standard (16" + 2")' })
  selectedSize: string;
}

export const CartItemSchema = SchemaFactory.createForClass(CartItem);

@Schema({ timestamps: true })
export class Cart {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  user: Types.ObjectId;

  @Prop({ type: [CartItemSchema], default: [] })
  items: CartItem[];
}

export const CartSchema = SchemaFactory.createForClass(Cart);
