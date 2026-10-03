export type CampaignType =
  | 'newsletter'
  | 'new_product'
  | 'sale'
  | 'order_update'
  | 'abandoned_cart'
  | 'review_request'
  | 'back_in_stock';

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'paused'
  | 'cancelled'
  | 'failed';

export type RecipientStatus =
  | 'pending'
  | 'sent'
  | 'failed'
  | 'unsubscribed';

export interface MarketingTemplate {
  id: string;
  name: string;
  templateKey: string;
  campaignType: CampaignType;
  subject: string;
  preheader?: string | null;
  htmlBody: string;
  textBody?: string | null;
  variables: string[];
  isActive: boolean;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  campaignType: CampaignType;
  templateId?: string | null;
  subject?: string | null;
  htmlBody?: string | null;
  textBody?: string | null;
  audienceFilter: Record<string, unknown>;
  status: CampaignStatus;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  openedCount: number;
  clickedCount: number;
}
