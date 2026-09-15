import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type ContactMessageDocument = ContactMessage & Document;

@Schema({ timestamps: true })
export class ContactMessage {
  @Prop({ type: String, required: true, trim: true }) name: string;
  @Prop({ type: String, required: true, lowercase: true, trim: true }) email: string;
  @Prop({ type: String, default: '' }) phone: string;
  @Prop({ type: String, default: 'Other' }) reason: string;
  @Prop({ type: String, default: '' }) orderId: string;
  @Prop({ type: String, required: true }) message: string;

  @Prop({
    type: String,
    enum: ['new', 'read', 'replied', 'archived'],
    default: 'new',
    index: true,
  })
  status: string;

  @Prop({ type: String, default: '' }) adminNote: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' }) user?: Types.ObjectId;
}

export const ContactMessageSchema = SchemaFactory.createForClass(ContactMessage);
