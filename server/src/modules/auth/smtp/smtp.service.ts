import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SupabaseService } from '../../../database/supabase.service.js';

@Injectable()
export class SmtpService {
  private readonly logger = new Logger(SmtpService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(SupabaseService) private readonly db: SupabaseService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST') || 'smtp.gmail.com',
      port: parseInt(this.configService.get<string>('SMTP_PORT') || '587', 10),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('SMTP_HOST') || 'smtp.gmail.com',
        port: parseInt(this.configService.get<string>('SMTP_PORT') || '587', 10),
        secure: false,
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
    }
    return this.transporter;
  }

  /** Emails are skipped (not failed) while SMTP is still on placeholder values. */
  isConfigured(): boolean {
    const user = this.configService.get<string>('SMTP_USER') || '';
    const pass = this.configService.get<string>('SMTP_PASS') || '';
    const placeholder = (value: string) =>
      !value || value.includes('your-') || value.includes('placeholder');
    return !placeholder(user) && !placeholder(pass);
  }

  private frontendUrl(): string {
    return (this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5177')
      .split(',')[0]
      .trim()
      .replace(/\/+$/, '');
  }

  /** Shared wrapper so every email looks like it came from the same store. */
  private shell(heading: string, body: string): string {
    return `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #222;">
        <h2 style="color: #d6b56d;">${heading}</h2>
        ${body}
        <p style="color: #746f68; font-size: 12px; margin-top: 28px; border-top: 1px solid #eee; padding-top: 14px;">
          Lustre &amp; Co. &middot; <a href="${this.frontendUrl()}" style="color: #746f68;">${this.frontendUrl()}</a>
        </p>
      </div>
    `;
  }

  /** Sends mail and logs failures. Never throws: email must not break a request. */
  private async send(to: string, subject: string, html: string, label: string): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn(`SMTP is not configured; skipped ${label} email to ${to}.`);
      return false;
    }
    try {
      await this.getTransporter().sendMail({
        from:
          this.configService.get<string>('SMTP_FROM') ||
          this.configService.get<string>('SMTP_USER'),
        to,
        subject,
        html,
      });
      this.logger.log(`${label} email sent to ${to}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send ${label} email to ${to}: ${err.message}`);
      return false;
    }
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

  private money(amount: number): string {
    return `Rs. ${Number(amount || 0).toLocaleString('en-IN')}`;
  }

  private itemRows(items: Array<{ name: string; quantity: number; price: number }>): string {
    return items
      .map(
        (item) => `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${item.name} &times; ${item.quantity}</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${this.money(
              item.price * item.quantity,
            )}</td>
          </tr>`,
      )
      .join('');
  }

  /** Tells the customer their order moved on, e.g. dispatched or delivered. */
  async sendOrderStatusEmail(order: {
    orderId: string;
    status: string;
    customer?: { fullName?: string; email?: string };
    items?: Array<{ name: string; quantity: number; price: number }>;
    carrier?: string;
    trackingNumber?: string;
    estimatedDeliveryDate?: string;
  }): Promise<void> {
    const email = order.customer?.email;
    if (!email) return;

    const headings: Record<string, string> = {
      Confirmed: 'Your order is confirmed',
      Processing: 'Your order is being prepared',
      'In Transit': 'Your order has been dispatched',
      Delivered: 'Your order has been delivered',
      Cancelled: 'Your order has been cancelled',
    };
    const messages: Record<string, string> = {
      Confirmed: 'Thank you for your order. We will start preparing it shortly.',
      Processing: 'Our team is packing your jewellery with care.',
      'In Transit': 'Your parcel is on its way to you.',
      Delivered: 'We hope you love your new pieces. Do write a review if you have a moment.',
      Cancelled: 'This order has been cancelled. Any amount paid online will be refunded.',
    };

    const tracking =
      order.status === 'In Transit' && order.trackingNumber
        ? `<p><strong>Carrier:</strong> ${order.carrier || 'Courier'}<br />
           <strong>Tracking number:</strong> ${order.trackingNumber}</p>`
        : '';
    const eta =
      order.estimatedDeliveryDate && order.status !== 'Delivered' && order.status !== 'Cancelled'
        ? `<p><strong>Expected delivery:</strong> ${order.estimatedDeliveryDate}</p>`
        : '';
    const items = order.items?.length
      ? `<table style="width: 100%; border-collapse: collapse; margin: 18px 0;">${this.itemRows(order.items)}</table>`
      : '';

    const body = `
      <p>Hi ${order.customer?.fullName || 'there'},</p>
      <p>${messages[order.status] || `Your order status is now ${order.status}.`}</p>
      <p><strong>Order:</strong> ${order.orderId}<br /><strong>Status:</strong> ${order.status}</p>
      ${tracking}
      ${eta}
      ${items}
      <a href="${this.frontendUrl()}/track-order" style="display: inline-block; padding: 12px 24px; background: #d6b56d; color: #222; text-decoration: none; border-radius: 4px; font-weight: 700;">Track your order</a>
    `;

    await this.send(
      email,
      `${headings[order.status] || 'Order update'} - ${order.orderId}`,
      this.shell(headings[order.status] || 'Order update', body),
      'order status',
    );
  }

  /** Nudges a shopper who left items in their cart. */
  async sendAbandonedCartEmail(
    email: string,
    name: string,
    items: Array<{ name: string; quantity: number; price: number }>,
  ): Promise<boolean> {
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const body = `
      <p>Hi ${name || 'there'},</p>
      <p>You left something behind. Your cart is still saved, so you can pick up where you left off.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 18px 0;">
        ${this.itemRows(items)}
        <tr>
          <td style="padding: 10px 0; font-weight: 700;">Total</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 700;">${this.money(total)}</td>
        </tr>
      </table>
      <a href="${this.frontendUrl()}/cart" style="display: inline-block; padding: 12px 24px; background: #d6b56d; color: #222; text-decoration: none; border-radius: 4px; font-weight: 700;">Return to your cart</a>
      <p style="color: #746f68; font-size: 13px; margin-top: 18px;">Stock is limited, so popular pieces can sell out.</p>
    `;
    return this.send(
      email,
      'You left something in your cart',
      this.shell('Still thinking it over?', body),
      'abandoned cart',
    );
  }

  /** Warns the store owner that stock is running out. */
  async sendLowStockEmail(
    products: Array<{ name: string; stockQuantity: number }>,
    threshold: number,
  ): Promise<void> {
    const to = this.configService.get<string>('ADMIN_EMAIL');
    if (!to || !products.length) return;

    const rows = products
      .map(
        (product) => `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${product.name}</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; color: ${
              product.stockQuantity === 0 ? '#b3261e' : '#8a6d1f'
            };">
              ${product.stockQuantity === 0 ? 'Out of stock' : `${product.stockQuantity} left`}
            </td>
          </tr>`,
      )
      .join('');

    const isOne = products.length === 1;
    const body = `
      <p>${isOne ? 'This product is' : 'These products are'} at or below your low-stock level of ${threshold}:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 18px 0;">${rows}</table>
      <a href="${this.frontendUrl()}/admin/products" style="display: inline-block; padding: 12px 24px; background: #d6b56d; color: #222; text-decoration: none; border-radius: 4px; font-weight: 700;">Restock in the admin</a>
    `;
    await this.send(
      to,
      `Low stock: ${products.length} product${isOne ? ' needs' : 's need'} restocking`,
      this.shell('Low stock alert', body),
      'low stock',
    );
  }
}
