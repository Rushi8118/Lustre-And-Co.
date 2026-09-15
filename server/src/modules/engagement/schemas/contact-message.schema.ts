import type { Doc } from '../../../common/utils/db.js';

export interface ContactMessage {
  name: string;
  email: string;
  phone: string;
  reason: string;
  orderId: string;
  message: string;
  status: 'new' | 'read' | 'replied' | 'archived' | string;
  adminNote: string;
  user?: string | null;
}

export type ContactMessageDocument = Doc<ContactMessage>;
