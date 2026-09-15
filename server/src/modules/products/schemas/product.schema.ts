import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @Prop({ type: String, required: true, unique: true, index: true })
  slug: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, index: true })
  sku?: string;

  @Prop({ type: String, required: true, index: true })
  category: string; // slug of a document in the categories collection

  @Prop({ type: String, default: 'everyday' })
  collectionName: string;

  @Prop({ type: String, default: 'everyday' })
  occasion: string; // 'everyday' | 'bridal' | 'party' | 'festive'

  @Prop({ type: Number, required: true })
  price: number;

  @Prop({ type: Number })
  oldPrice?: number;

  /** Average of approved reviews; recalculated whenever reviews are moderated. */
  @Prop({ type: Number, default: 0 })
  rating: number;

  /** Count of approved reviews. */
  @Prop({ type: Number, default: 0 })
  reviews: number;

  @Prop({ type: String })
  badge?: string;

  @Prop({ type: String, default: '18K Gold Plated' })
  finish: string;

  @Prop({ type: String, default: 'Gold-plated brass' })
  material: string;

  @Prop({ type: [String], default: ['Gold'] })
  availableColors: string[];

  @Prop({ type: [String], default: ['Standard (16" + 2")'] })
  availableSizes: string[];

  @Prop({ type: String, default: 'in-stock' })
  availability: string;

  @Prop({ type: Number, default: 50 })
  stockQuantity: number;

  /** Units sold across non-cancelled orders. */
  @Prop({ type: Number, default: 0 })
  salesCount: number;

  @Prop({ type: String, required: true })
  image: string;

  @Prop({ type: [String], default: [] })
  gallery: string[];

  @Prop({ type: String })
  description?: string;

  @Prop({ type: [String], default: [] })
  details: string[];

  @Prop({ type: [String], default: [] })
  care: string[];

  @Prop({ type: [String], default: [] })
  shipping: string[];

  @Prop({ type: [String], default: [] })
  returns: string[];

  @Prop({ type: [String], default: [] })
  tags: string[]; // 'new' and 'bestseller' drive the New Arrivals / Best Sellers pages

  /** Hidden products are excluded from the storefront but stay visible to admins. */
  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  @Prop({ type: Boolean, default: false })
  isFeatured: boolean;

  /** Legacy embedded reviews, migrated into the reviews collection by the seeder. */
  @Prop({ type: [Object], select: false })
  customerReviews?: any[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
