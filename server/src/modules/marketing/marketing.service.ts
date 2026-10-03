import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { SmtpService } from '../auth/smtp/smtp.service.js';
import { SupabaseService } from '../../database/supabase.service.js';
import { CreateTemplateDto } from './dto/create-template.dto.js';
import { CreateCampaignDto } from './dto/create-campaign.dto.js';
import { SubscribeBackInStockDto } from './dto/subscribe-back-in-stock.dto.js';
import {
  getTemplateVariables,
  renderTemplate,
  SUPPORTED_TEMPLATE_VARIABLES,
} from './utils/template-renderer.js';

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(
    private readonly db: SupabaseService,
    private readonly smtpService: SmtpService,
  ) {}

  async listTemplates() {
    const { data, error } = await this.db
      .from('marketing_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    return (data || []).map((template: any) => ({
      id: template.id,
      name: template.name,
      templateKey: template.template_key,
      campaignType: template.campaign_type,
      subject: template.subject,
      preheader: template.preheader,
      htmlBody: template.html_body,
      textBody: template.text_body,
      variables: template.variables || [],
      isActive: template.is_active,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
    }));
  }

  async createTemplate(
    dto: CreateTemplateDto,
    createdBy?: string,
  ) {
    const detectedVariables = [
      ...new Set([
        ...(dto.variables || []),
        ...getTemplateVariables(dto.subject),
        ...getTemplateVariables(dto.htmlBody),
        ...getTemplateVariables(dto.textBody || ''),
      ]),
    ];

    const unsupported = detectedVariables.filter(
      (variable) => !SUPPORTED_TEMPLATE_VARIABLES.includes(variable),
    );

    if (unsupported.length) {
      throw new BadRequestException(
        `Unsupported template variables: ${unsupported.join(', ')}`,
      );
    }

    const { data, error } = await this.db
      .from('marketing_templates')
      .insert({
        name: dto.name.trim(),
        template_key: dto.templateKey.trim().toLowerCase(),
        campaign_type: dto.campaignType,
        subject: dto.subject,
        preheader: dto.preheader || null,
        html_body: dto.htmlBody,
        text_body: dto.textBody || null,
        variables: detectedVariables,
        is_active: dto.isActive ?? true,
        created_by: createdBy || null,
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new BadRequestException('Template key already exists.');
      }
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async updateTemplate(
    id: string,
    dto: Partial<CreateTemplateDto>,
  ) {
    const payload: Record<string, unknown> = {};

    if (dto.name !== undefined) payload.name = dto.name;
    if (dto.templateKey !== undefined) {
      payload.template_key = dto.templateKey.trim().toLowerCase();
    }
    if (dto.campaignType !== undefined) {
      payload.campaign_type = dto.campaignType;
    }
    if (dto.subject !== undefined) {
      payload.subject = dto.subject;
    }
    if (dto.preheader !== undefined) {
      payload.preheader = dto.preheader;
    }
    if (dto.htmlBody !== undefined) {
      payload.html_body = dto.htmlBody;
    }
    if (dto.textBody !== undefined) {
      payload.text_body = dto.textBody;
    }
    if (dto.isActive !== undefined) {
      payload.is_active = dto.isActive;
    }

    const variables = [
      ...new Set([
        ...(dto.variables || []),
        ...getTemplateVariables(dto.subject || ''),
        ...getTemplateVariables(dto.htmlBody || ''),
        ...getTemplateVariables(dto.textBody || ''),
      ]),
    ];

    if (variables.length) payload.variables = variables;

    const { data, error } = await this.db
      .from('marketing_templates')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);

    return data;
  }

  async createCampaign(
    dto: CreateCampaignDto,
    createdBy?: string,
  ) {
    let template: any = null;

    if (dto.templateId) {
      const { data, error } = await this.db
        .from('marketing_templates')
        .select('*')
        .eq('id', dto.templateId)
        .maybeSingle();

      if (error) throw new BadRequestException(error.message);
      if (!data) {
        throw new NotFoundException('Marketing template not found.');
      }

      template = data;
    }

    const { data, error } = await this.db
      .from('marketing_campaigns')
      .insert({
        name: dto.name.trim(),
        campaign_type: dto.campaignType,
        template_id: dto.templateId || null,
        subject: dto.subject || template?.subject || null,
        html_body: dto.htmlBody || template?.html_body || null,
        text_body: dto.textBody || template?.text_body || null,
        audience_filter: dto.audienceFilter || {},
        status: dto.scheduledAt ? 'scheduled' : 'draft',
        scheduled_at: dto.scheduledAt || null,
        created_by: createdBy || null,
      })
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);

    return data;
  }

  async listCampaigns() {
    const { data, error } = await this.db
      .from('marketing_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    return data || [];
  }

  private async getCampaign(id: string) {
    const { data, error } = await this.db
      .from('marketing_campaigns')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!data) {
      throw new NotFoundException('Campaign not found.');
    }

    return data;
  }

  private async getAudience(
    audienceFilter: Record<string, unknown>,
  ) {
    let query = this.db
      .from('users')
      .select('id,name,email')
      .not('email', 'is', null);

    if (audienceFilter?.role) {
      query = query.eq('role', audienceFilter.role);
    }

    const { data, error } = await query;

    if (error) throw new BadRequestException(error.message);

    const users = (data || []).filter((user: any) => user.email);

    const emailSet = new Set<string>();
    const unique: Array<{ userId: string; email: string; customerName: string }> = [];

    for (const user of users) {
      const email = String(user.email).trim().toLowerCase();

      if (!emailSet.has(email)) {
        emailSet.add(email);
        unique.push({
          userId: user.id,
          email,
          customerName: user.name || 'Customer',
        });
      }
    }

    if (!unique.length) {
      return [];
    }

    const { data: unsubscribed, error: unsubscribeError } = await this.db
      .from('marketing_unsubscribes')
      .select('email')
      .in(
        'email',
        unique.map((user) => user.email),
      );

    if (unsubscribeError) {
      throw new BadRequestException(unsubscribeError.message);
    }

    const blocked = new Set((unsubscribed || []).map((item: any) => item.email));

    return unique.filter((user) => !blocked.has(user.email));
  }

  private async prepareRecipients(campaign: any) {
    const audience = await this.getAudience(
      campaign.audience_filter || {},
    );

    if (!audience.length) {
      throw new BadRequestException(
        'No subscribed customers match this audience.',
      );
    }

    const { error } = await this.db
      .from('marketing_campaign_recipients')
      .upsert(
        audience.map((recipient) => ({
          campaign_id: campaign.id,
          user_id: recipient.userId,
          email: recipient.email,
          customer_name: recipient.customerName,
          status: 'pending',
        })),
        {
          onConflict: 'campaign_id,email',
        },
      );

    if (error) throw new BadRequestException(error.message);

    await this.db
      .from('marketing_campaigns')
      .update({
        total_recipients: audience.length,
      })
      .eq('id', campaign.id);

    return audience;
  }

  async sendCampaign(id: string) {
    const campaign = await this.getCampaign(id);

    if (['sending', 'sent', 'cancelled'].includes(campaign.status)) {
      throw new BadRequestException(
        `Campaign cannot be sent in status ${campaign.status}.`,
      );
    }

    const recipients = await this.prepareRecipients(campaign);

    await this.db
      .from('marketing_campaigns')
      .update({
        status: 'sending',
        started_at: new Date().toISOString(),
      })
      .eq('id', id);

    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      try {
        const storeUrl =
          process.env.STOREFRONT_URL ||
          process.env.FRONTEND_URL ||
          'http://localhost:5173';

        const context = {
          customerName: recipient.customerName,
          storeName: process.env.STORE_NAME || 'Lustre & Co.',
          storeUrl,
          unsubscribeLink: `${storeUrl}/unsubscribe?email=${encodeURIComponent(
            recipient.email,
          )}`,
        };

        const subject = renderTemplate(
          campaign.subject || '',
          context,
        );

        const html = renderTemplate(
          campaign.html_body || '',
          context,
          true,
        );

        const text = renderTemplate(
          campaign.text_body || '',
          context,
        );

        const sent = await this.smtpService.sendMail({
          to: recipient.email,
          subject,
          html,
          text,
        });

        if (!sent) {
          throw new Error('SMTP delivery failed.');
        }

        await this.db
          .from('marketing_campaign_recipients')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('campaign_id', id)
          .eq('email', recipient.email);

        await this.db.from('marketing_events').insert({
          campaign_id: id,
          event_type: 'sent',
          metadata: {
            email: recipient.email,
          },
        });

        sentCount++;
      } catch (error) {
        failedCount++;

        await this.db
          .from('marketing_campaign_recipients')
          .update({
            status: 'failed',
            failure_reason:
              error instanceof Error
                ? error.message
                : String(error),
          })
          .eq('campaign_id', id)
          .eq('email', recipient.email);
      }
    }

    await this.db
      .from('marketing_campaigns')
      .update({
        status: failedCount && !sentCount ? 'failed' : 'sent',
        sent_count: sentCount,
        failed_count: failedCount,
        completed_at: new Date().toISOString(),
      })
      .eq('id', id);

    return {
      campaignId: id,
      totalRecipients: recipients.length,
      sentCount,
      failedCount,
    };
  }

  async processScheduledCampaigns() {
    const { data, error } = await this.db
      .from('marketing_campaigns')
      .select('id')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())
      .limit(20);

    if (error) {
      throw new BadRequestException(error.message);
    }

    let processed = 0;

    for (const campaign of data || []) {
      try {
        await this.sendCampaign(campaign.id);
        processed++;
      } catch (campaignError) {
        this.logger.error(
          `Campaign ${campaign.id} failed: ${
            campaignError instanceof Error
              ? campaignError.message
              : String(campaignError)
          }`,
        );
      }
    }

    return {
      discovered: data?.length || 0,
      processed,
    };
  }

  async subscribeBackInStock(dto: SubscribeBackInStockDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Email or phone is required.');
    }

    const { data: product, error: productError } = await this.db
      .from('products')
      .select('id,name,stock,stock_quantity,availability')
      .eq('id', dto.productId)
      .maybeSingle();

    if (productError) {
      throw new BadRequestException(productError.message);
    }

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    const stock = Number(product.stock_quantity ?? product.stock ?? 0);
    const available = stock > 0 && product.availability !== 'out-of-stock';

    if (available) {
      throw new BadRequestException('This product is already available.');
    }

    const notificationToken = randomBytes(24).toString('hex');

    const { data, error } = await this.db
      .from('back_in_stock_requests')
      .insert({
        product_id: dto.productId,
        email: dto.email?.trim().toLowerCase() || null,
        phone: dto.phone?.trim() || null,
        channel: dto.channel || 'email',
        notification_token: notificationToken,
        status: 'waiting',
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new BadRequestException(
          'You are already subscribed for this product.',
        );
      }
      throw new BadRequestException(error.message);
    }

    return {
      success: true,
      requestId: data.id,
      message: 'You will be notified when this product is available.',
    };
  }

  async cancelBackInStockSubscription(token: string) {
    const { data, error } = await this.db
      .from('back_in_stock_requests')
      .update({
        status: 'cancelled',
      })
      .eq('notification_token', token)
      .eq('status', 'waiting')
      .select('*')
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!data) {
      throw new NotFoundException('Back-in-stock subscription not found.');
    }

    return {
      success: true,
    };
  }

  async notifyBackInStock(productId: string) {
    const { data: product, error: productError } = await this.db
      .from('products')
      .select('id,name,slug,stock,stock_quantity,availability,image,images')
      .eq('id', productId)
      .maybeSingle();

    if (productError) {
      throw new BadRequestException(productError.message);
    }

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    const stock = Number(product.stock_quantity ?? product.stock ?? 0);
    const available = stock > 0 && product.availability !== 'out-of-stock';

    if (!available) {
      throw new BadRequestException('Product is not available yet.');
    }

    const { data: requests, error } = await this.db
      .from('back_in_stock_requests')
      .select('*')
      .eq('product_id', productId)
      .eq('status', 'waiting')
      .limit(1000);

    if (error) throw new BadRequestException(error.message);

    let notified = 0;
    let failed = 0;

    const storeUrl =
      process.env.STOREFRONT_URL ||
      process.env.FRONTEND_URL ||
      'http://localhost:5173';

    const productUrl = `${storeUrl}/product/${product.slug || product.id}`;
    const productImage = product.image || (Array.isArray(product.images) ? product.images[0] : null);

    for (const request of requests || []) {
      if (!request.email) continue;

      try {
        const sent = await this.smtpService.sendMail({
          to: request.email,
          subject: `${product.name} is back in stock ✨`,
          html: `
            <div style="font-family:'DM Sans', Arial, sans-serif; color:#222; max-width:600px; margin:0 auto; padding:24px; border:1px solid #ebd9c0; border-radius:12px; background:#fff;">
              <div style="text-align:center; padding-bottom:16px; border-bottom:1px solid #f2e9dc;">
                <p style="text-transform:uppercase; letter-spacing:2px; font-size:11px; font-weight:700; color:#d6b56d; margin:0;">Lustre & Co.</p>
                <h1 style="font-size:22px; font-weight:600; color:#1c1917; margin:8px 0 0 0;">It's Back in Stock!</h1>
              </div>
              <div style="padding:24px 0; text-align:center;">
                ${productImage ? `<img src="${productImage}" alt="${product.name}" style="max-width:220px; border-radius:8px; margin-bottom:16px;" />` : ''}
                <p style="font-size:16px; font-weight:600; color:#1c1917; margin:0 0 8px 0;">${product.name}</p>
                <p style="color:#57534e; font-size:14px; line-height:1.6; margin:0 0 20px 0;">
                  Good news! The exquisite piece you were eyeing is available again. Quantities are limited, so reserve yours now.
                </p>
                <a href="${productUrl}" style="display:inline-block; padding:12px 32px; background:#d6b56d; color:#1c1917; text-decoration:none; border-radius:6px; font-weight:700; font-size:14px;">
                  Shop Now &rarr;
                </a>
              </div>
              <div style="border-top:1px solid #f2e9dc; padding-top:16px; text-align:center; font-size:12px; color:#8c827a;">
                <p style="margin:0;">You received this because you requested a restock notification for this product.</p>
              </div>
            </div>
          `,
          text: `${product.name} is back in stock at Lustre & Co.!

Shop now: ${productUrl}`,
        });

        if (!sent) {
          throw new Error('Could not send notification.');
        }

        await this.db
          .from('back_in_stock_requests')
          .update({
            status: 'notified',
            notified_at: new Date().toISOString(),
          })
          .eq('id', request.id);

        notified++;
      } catch (error) {
        failed++;
        this.logger.warn(
          `Back-in-stock notification failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return {
      productId,
      recipients: requests?.length || 0,
      notified,
      failed,
    };
  }

  async trackAnalyticsEvent(
    userId: string | undefined,
    dto: {
      eventType: string;
      sessionId?: string;
      productId?: string;
      orderId?: string;
      pagePath?: string;
      deviceType?: string;
      browser?: string;
      operatingSystem?: string;
      country?: string;
      state?: string;
      city?: string;
      value?: number;
      metadata?: Record<string, unknown>;
    },
  ) {
    const { error } = await this.db
      .from('analytics_events')
      .insert({
        user_id: userId || null,
        session_id: dto.sessionId || null,
        event_type: dto.eventType,
        product_id: dto.productId || null,
        order_id: dto.orderId || null,
        page_path: dto.pagePath || null,
        device_type: dto.deviceType || null,
        browser: dto.browser || null,
        operating_system: dto.operatingSystem || null,
        country: dto.country || null,
        state: dto.state || null,
        city: dto.city || null,
        value: dto.value || 0,
        metadata: dto.metadata || {},
      });

    if (error) {
      this.logger.warn(
        `Could not record analytics event: ${error.message}`,
      );
      return { success: false };
    }

    return { success: true };
  }

  async unsubscribe(email: string, reason?: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const { error } = await this.db
      .from('marketing_unsubscribes')
      .upsert(
        {
          email: normalizedEmail,
          reason: reason || null,
          source: 'customer',
        },
        { onConflict: 'email' },
      );

    if (error) throw new BadRequestException(error.message);

    return { success: true };
  }
}
