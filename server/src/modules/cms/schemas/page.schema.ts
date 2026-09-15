import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PageDocument = Page & Document;

export interface PageSection {
  eyebrow?: string;
  heading?: string;
  body?: string;
  bullets?: string[];
  items?: Array<{ title: string; text: string }>;
  image?: string;
  ctaLabel?: string;
  ctaLink?: string;
}

/** Editable content pages: about, shipping-returns, jewelry-care, privacy, terms. */
@Schema({ timestamps: true, minimize: false })
export class Page {
  @Prop({ type: String, required: true, unique: true, index: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ type: String, required: true }) title: string;
  @Prop({ type: String, default: '' }) eyebrow: string;
  @Prop({ type: String, default: '' }) description: string;
  @Prop({ type: [Object], default: [] }) sections: PageSection[];
  @Prop({ type: Boolean, default: true }) isPublished: boolean;
}

export const PageSchema = SchemaFactory.createForClass(Page);
