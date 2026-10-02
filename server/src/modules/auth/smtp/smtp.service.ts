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
}
