import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SettingsDocument = Settings & Document;

/** Singleton document (key = "store") holding all admin-editable storefront configuration. */
@Schema({ timestamps: true, minimize: false })
export class Settings {
  @Prop({ type: String, required: true, unique: true, default: 'store' }) key: string;
  @Prop({ type: Object, default: {} }) store: Record<string, any>;
  @Prop({ type: Object, default: {} }) social: Record<string, any>;
  @Prop({ type: Object, default: {} }) commerce: Record<string, any>;
  @Prop({ type: Object, default: {} }) announcement: Record<string, any>;
  @Prop({ type: Object, default: {} }) homepage: Record<string, any>;
  @Prop({ type: Object, default: {} }) newsletter: Record<string, any>;
  @Prop({ type: Object, default: {} }) seo: Record<string, any>;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
