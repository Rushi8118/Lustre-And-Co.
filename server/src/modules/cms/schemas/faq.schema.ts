import type { Doc } from '../../../common/utils/db.js';

export interface Faq {
  question: string;
  answer: string;
  group: string;
  sortOrder: number;
  isActive: boolean;
}

export type FaqDocument = Doc<Faq>;
