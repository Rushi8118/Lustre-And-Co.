import type { Doc } from '../../../common/utils/db.js';

export interface Review {
  /** Product id. */
  product: string;
  user?: string | null;
  author: string;
  rating: number;
  title: string;
  comment: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  verifiedPurchase: boolean;
}

export type ReviewDocument = Doc<Review>;
