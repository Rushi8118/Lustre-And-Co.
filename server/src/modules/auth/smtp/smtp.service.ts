import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SupabaseService } from '../../../database/supabase.service.js';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

@Injectable()
export class SmtpService {
  private readonly logger = new Logger(SmtpService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(SupabaseService) private readonly db: SupabaseService,
  ) {
    this.transporter = this.createTransporter();
  }

  private createTransporter(): nodemailer.Transporter {
    const host = this.configService.get<string>('SMTP_HOST') || 'smtp.gmail.com';
    const port = parseInt(this.configService.get<string>('SMTP_PORT') || '587', 10);
    const user = this.configService.get<string>('SMTP_USER') || process.env.SMTP_USER;
    const rawPass =
      this.configService.get<string>('SMTP_PASS') ||
      this.configService.get<string>('SMTP_PASSWORD') ||
      process.env.SMTP_PASS ||
      process.env.SMTP_PASSWORD ||
      '';
    const pass = rawPass.replace(/\s+/g, '');
    const secure =
      this.configService.get<string>('SMTP_SECURE') === 'true' || port === 465;

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  private getFromAddress(): string {
    return (
      process.env.SMTP_FROM ||
      this.configService.get<string>('SMTP_FROM') ||
      (this.configService.get<string>('SMTP_USER')
        ? `Lustre & Co. <${this.configService.get<string>('SMTP_USER')}>`
        : 'Lustre & Co. <no-reply@lustreandco.com>')
    );
  }

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = this.createTransporter();
    }
    return this.transporter;
  }

  async sendPasswordResetEmail(userEmail: string, token: string): Promise<void> {
    const frontendUrl = (this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5177')
      .split(',')[0]
      .trim();
    const resetUrl = `${frontendUrl}/account/reset-password?token=${token}`;

    const { data: user } = await this.db.from('users').select('name').eq('email', userEmail).maybeSingle();
    const userName = user?.name || 'Customer';

    try {
      await this.getTransporter().sendMail({
        from: this.getFromAddress(),
        to: userEmail,
        subject: 'Password Reset - Lustre & Co.',
        html: `
          <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #222;">
            <h2 style="color: #d6b56d;">Password Reset Request</h2>
            <p>Hi ${userName},</p>
            <p>You requested a password reset. Click the button below to set a new password:</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #d6b56d; color: #222; text-decoration: none; border-radius: 4px; font-weight: 700;">Reset Password</a>
            <p style="color: #746f68; font-size: 13px; margin-top: 20px;">This link expires in 1 hour.</p>
            <p style="color: #746f68; font-size: 13px;">If you didn't request this, please ignore this email.</p>
          </div>
        `,
      });
      this.logger.log(`Password reset email sent to ${userEmail}`);
    } catch (err: any) {
      // Not rethrown: an error response here would reveal which emails have accounts.
      this.logger.error(`Failed to send password reset email to ${userEmail}: ${err.message}`);
    }
  }

  async sendWelcomeEmail(userEmail: string, userName: string): Promise<void> {
    const frontendUrl = (this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5177')
      .split(',')[0]
      .trim();
    try {
      await this.getTransporter().sendMail({
        from: this.getFromAddress(),
        to: userEmail,
        subject: 'Welcome to Lustre & Co.',
        html: `
          <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #222;">
            <h2 style="color: #d6b56d;">Welcome to Lustre & Co.</h2>
            <p>Dear ${userName},</p>
            <p>Thank you for creating your account with us! We're excited to have you on board.</p>
            <p>Browse our collection of imitation jewelry and find your perfect piece.</p>
            <a href="${frontendUrl}" style="display: inline-block; padding: 12px 24px; background: #d6b56d; color: #222; text-decoration: none; border-radius: 4px; font-weight: 700;">Shop Now</a>
          </div>
        `,
      });
      this.logger.log(`Welcome email sent to ${userEmail}`);
    } catch (err: any) {
      this.logger.error(`Failed to send welcome email to ${userEmail}: ${err.message}`);
    }
  }

  async sendAbandonedCartEmail(options: {
    to: string;
    customerName: string;
    items: Array<{
      name: string;
      price: number;
      quantity: number;
      image?: string;
      color?: string;
      size?: string;
    }>;
    subtotal: number;
    cartUrl?: string;
    couponCode?: string;
    discountPercent?: number;
    subject?: string;
    headline?: string;
    bodyText?: string;
  }): Promise<boolean> {
    const frontendUrl = (this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5177')
      .split(',')[0]
      .trim();
    const cartUrl = options.cartUrl || `${frontendUrl}/cart`;
    const customerName = options.customerName || 'Shopper';
    const subject = options.subject || 'You left something radiant in your bag ✨';
    const headline = options.headline || 'Your curated pieces are waiting for you';
    const bodyText =
      options.bodyText ||
      'We noticed you left some exquisite pieces in your shopping bag. Complete your purchase now before popular pieces sell out.';

    const itemsHtml = (options.items || [])
      .map(
        (item) => `
        <tr style="border-bottom: 1px solid #f0eae1;">
          <td style="padding: 12px 8px; width: 64px;">
            ${
              item.image
                ? `<img src="${item.image}" alt="${item.name}" style="width: 56px; height: 56px; object-fit: cover; border-radius: 6px; border: 1px solid #eee;" />`
                : `<div style="width: 56px; height: 56px; background: #f5f0eb; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 20px;">✦</div>`
            }
          </td>
          <td style="padding: 12px 12px;">
            <p style="margin: 0; font-weight: 600; font-size: 14px; color: #1c1917;">${item.name}</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #78716c;">
              ${[item.color ? `Color: ${item.color}` : '', item.size ? `Size: ${item.size}` : '', `Qty: ${item.quantity}`]
                .filter(Boolean)
                .join(' • ')}
            </p>
          </td>
          <td style="padding: 12px 8px; text-align: right; font-weight: 700; font-size: 14px; color: #1c1917;">
            ₹${Number(item.price * item.quantity).toLocaleString('en-IN')}
          </td>
        </tr>
      `,
      )
      .join('');

    const couponHtml = options.couponCode
      ? `
      <div style="margin: 24px 0; padding: 16px; background: #fbf7ee; border: 1px dashed #d6b56d; border-radius: 8px; text-align: center;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #9c7827; font-weight: 700;">Special Comeback Offer</span>
        <p style="margin: 6px 0 4px 0; font-size: 16px; font-weight: 700; color: #1c1917;">
          Use code <span style="background: #ffffff; padding: 4px 10px; border-radius: 4px; border: 1px solid #d6b56d; color: #9c7827; font-family: monospace; letter-spacing: 1px;">${options.couponCode}</span>
          ${options.discountPercent ? ` for ${options.discountPercent}% OFF` : ''}
        </p>
        <span style="font-size: 12px; color: #78716c;">Apply this code at checkout to claim your savings.</span>
      </div>
    `
      : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 24px 12px; background-color: #faf8f5; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif; color: #292524;">
        <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #ebd9c0; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);">
          <!-- Header -->
          <div style="background: #1c1917; padding: 32px 24px; text-align: center;">
            <p style="margin: 0 0 6px 0; color: #d6b56d; font-size: 11px; text-transform: uppercase; letter-spacing: 2.5px; font-weight: 700;">Lustre & Co.</p>
            <h1 style="margin: 0; color: #faf8f5; font-size: 22px; font-weight: 600; letter-spacing: 0.5px;">${headline}</h1>
          </div>

          <!-- Body -->
          <div style="padding: 32px 24px;">
            <p style="font-size: 15px; margin: 0 0 12px 0;">Hi ${customerName},</p>
            <p style="font-size: 14px; line-height: 1.6; color: #57534e; margin: 0 0 24px 0;">
              ${bodyText}
            </p>

            <!-- Items -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
              ${itemsHtml}
            </table>

            <!-- Subtotal -->
            <div style="display: flex; justify-content: space-between; border-top: 1px solid #ebd9c0; padding-top: 14px; font-size: 14px;">
              <span style="font-weight: 600; color: #57534e;">Bag Subtotal:</span>
              <span style="font-weight: 700; color: #1c1917;">₹${Number(options.subtotal).toLocaleString('en-IN')}</span>
            </div>

            <!-- Coupon Callout -->
            ${couponHtml}

            <!-- CTA -->
            <div style="text-align: center; margin-top: 28px; margin-bottom: 16px;">
              <a href="${cartUrl}" style="display: inline-block; padding: 14px 36px; background: #d6b56d; color: #1c1917; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 15px; letter-spacing: 0.5px; box-shadow: 0 2px 8px rgba(214, 181, 109, 0.3);">
                Return to Your Bag &rarr;
              </a>
            </div>

            <p style="text-align: center; font-size: 12px; color: #a8a29e; margin-top: 16px;">
              Need assistance? Simply reply to this email or contact our concierge.
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #faf8f5; border-top: 1px solid #ebd9c0; padding: 20px 24px; text-align: center; font-size: 12px; color: #78716c;">
            <p style="margin: 0 0 4px 0; font-weight: 600;">Lustre & Co. • Modern Imitation Jewelry</p>
            <p style="margin: 0;">Everyday elegance, made to shine.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.getTransporter().sendMail({
        from: this.getFromAddress(),
        to: options.to,
        subject,
        html,
      });
      this.logger.log(`Abandoned cart recovery email sent to ${options.to}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send abandoned cart recovery email to ${options.to}: ${err.message}`);
      return false;
    }
  }

  async sendMail(
    toOrOptions: string | SendMailOptions,
    subject?: string,
    html?: string,
    text?: string,
  ): Promise<boolean> {
    const opts: SendMailOptions =
      typeof toOrOptions === 'string'
        ? { to: toOrOptions, subject: subject || '', html: html || '', text }
        : toOrOptions;

    const from =
      opts.from ||
      process.env.SMTP_FROM ||
      this.configService.get<string>('SMTP_FROM') ||
      process.env.SMTP_USER ||
      this.configService.get<string>('SMTP_USER') ||
      'no-reply@lustreandco.com';

    try {
      await this.getTransporter().sendMail({
        from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Email delivery failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }
}
