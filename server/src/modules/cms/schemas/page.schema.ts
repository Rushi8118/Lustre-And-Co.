import type { Doc } from '../../../common/utils/db.js';

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
export interface Page {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  sections: PageSection[];
  isPublished: boolean;
}

export type PageDocument = Doc<Page>;
