import type { Doc } from '../../../common/utils/db.js';

export interface Subscriber {
  email: string;
  isActive: boolean;
  source: string;
}

export type SubscriberDocument = Doc<Subscriber>;
