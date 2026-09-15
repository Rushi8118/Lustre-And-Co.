import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
  @Prop({ type: String, required: true, trim: true }) name: string;
  @Prop({ type: String, required: true, unique: true, index: true, lowercase: true, trim: true }) slug: string;
  @Prop({ type: String, default: '' }) eyebrow: string;
  @Prop({ type: String, default: '' }) title: string;
  @Prop({ type: String, default: '' }) description: string;
  @Prop({ type: String, default: '' }) image: string;
  @Prop({ type: Number, default: 0 }) sortOrder: number;
  @Prop({ type: Boolean, default: true }) isActive: boolean;
  @Prop({ type: Boolean, default: true }) showInMenu: boolean;
  @Prop({ type: Boolean, default: true }) showOnHome: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
