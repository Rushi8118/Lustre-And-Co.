import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SubscriberDocument = Subscriber & Document;

@Schema({ timestamps: true })
export class Subscriber {
  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true }) email: string;
  @Prop({ type: Boolean, default: true }) isActive: boolean;
  @Prop({ type: String, default: 'footer' }) source: string;
}

export const SubscriberSchema = SchemaFactory.createForClass(Subscriber);
