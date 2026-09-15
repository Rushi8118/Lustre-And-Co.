import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';
import { Product } from '../../products/schemas/product.schema.js';

export type UserDocument = User & Document;

@Schema()
export class Address {
  @Prop({ type: String, required: true }) fullName: string;
  @Prop({ type: String, required: true }) phone: string;
  @Prop({ type: String, required: true }) address: string;
  @Prop({ type: String, required: true }) city: string;
  @Prop({ type: String, required: true }) state: string;
  @Prop({ type: String, required: true }) postalCode: string;
  @Prop({ type: String, default: 'India' }) country: string;
  @Prop({ type: Boolean, default: false }) isDefault: boolean;
}

export const AddressSchema = SchemaFactory.createForClass(Address);

@Schema({ timestamps: true })
export class User {
  @Prop({ type: String, required: true }) name: string;
  @Prop({ type: String, required: true, unique: true, index: true }) email: string;
  @Prop({ type: String }) googleId?: string;
  @Prop({ type: String, default: 'local' }) provider: string;
  @Prop({ type: String, required: true }) password: string;
  @Prop({ type: String, default: 'customer', enum: ['customer', 'admin'] }) role: string;
  @Prop({ type: String }) phone?: string;
  @Prop({ type: [AddressSchema], default: [] }) addresses: Address[];

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: Product.name }],
    default: [],
  })
  wishlist: Types.ObjectId[];

  /** Deactivated accounts cannot sign in or use existing tokens. */
  @Prop({ type: Boolean, default: true }) isActive: boolean;
  @Prop({ type: Date }) lastLoginAt?: Date;

  /** SHA-256 hash of the single-use reset token; the raw token is never stored. */
  @Prop({ type: String }) resetPasswordTokenHash?: string;
  @Prop({ type: Date }) resetPasswordExpires?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

export const PRIVATE_USER_FIELDS = '-password -resetPasswordTokenHash -resetPasswordExpires';
