import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FaqDocument = Faq & Document;

@Schema({ timestamps: true })
export class Faq {
  @Prop({ type: String, required: true, trim: true }) question: string;
  @Prop({ type: String, required: true }) answer: string;
  @Prop({ type: String, required: true, default: 'General', index: true }) group: string;
  @Prop({ type: Number, default: 0 }) sortOrder: number;
  @Prop({ type: Boolean, default: true }) isActive: boolean;
}

export const FaqSchema = SchemaFactory.createForClass(Faq);
