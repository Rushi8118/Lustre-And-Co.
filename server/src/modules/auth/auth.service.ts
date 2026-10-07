import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import crypto, { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { Verify2faDto } from './dto/verify-2fa.dto.js';
import type { UserDocument } from '../users/schemas/user.schema.js';
import { SmtpService } from './smtp/smtp.service.js';
import { SupabaseService } from '../../database/supabase.service.js';
import { isUuid, toDoc, unwrap } from '../../common/utils/db.js';
import { AuditLogService } from '../audit/audit.service.js';
import {
  ADMIN_ROLES,
  ROLE_DEFAULT_PERMISSIONS,
} from '../../common/constants/roles-permissions.js';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
export const REFRESH_TOKEN_TTL_DAYS = 30;
const TWO_FACTOR_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(SupabaseService) private readonly db: SupabaseService,
    private readonly smtpService: SmtpService,
    private readonly auditLogService: AuditLogService,
  ) {}

  sanitizeUser(user: any) {
    const {
      password,
      resetPasswordTokenHash,
      resetPasswordExpires,
      two_factor_secret,
      two_factor_temp_code,
      two_factor_temp_expires,
      ...safe
    } = user;

    const role = (user.role || 'customer').toLowerCase().trim();
    const defaultPerms = ROLE_DEFAULT_PERMISSIONS[role] || [];
    const customPerms = Array.isArray(user.permissions) ? user.permissions : [];
    const permissions = [...new Set([...defaultPerms, ...customPerms])];

    return {
      ...safe,
      _id: user.id,
      id: user.id,
      role,
      permissions,
      twoFactorEnabled: Boolean(user.two_factor_enabled || user.twoFactorEnabled),
    };
  }

  private async createRefreshToken(
    userId: string,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<string> {
    const rawToken = randomBytes(40).toString('hex');
    const tokenHash = hashToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    await this.db.from('auth_refresh_tokens').insert({
      user_id: userId,
      token_hash: tokenHash,
      device_info: meta?.userAgent || null,
      ip_address: meta?.ip || null,
      expires_at: expiresAt.toISOString(),
      revoked: false,
    });

    return rawToken;
  }

  private generateAccessToken(user: any): string {
    const role = (user.role || 'customer').toLowerCase().trim();
    const defaultPerms = ROLE_DEFAULT_PERMISSIONS[role] || [];
    const customPerms = Array.isArray(user.permissions) ? user.permissions : [];
    const permissions = [...new Set([...defaultPerms, ...customPerms])];

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role,
      permissions,
    };

    return this.jwtService.sign(payload);
  }

  async register(
    dto: RegisterDto,
    meta?: { ip?: string; userAgent?: string },
  ) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email address already exists.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.usersService.create({
      name: dto.name.trim(),
      email: dto.email.toLowerCase().trim(),
      password: hashedPassword,
      role: 'customer',
      addresses: [],
      lastLoginAt: new Date().toISOString(),
    });

    await this.smtpService.sendWelcomeEmail(user.email, user.name);

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.createRefreshToken(user.id, meta);

    await this.auditLogService.recordLog({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'auth.register',
      resource: 'users',
      resourceId: user.id,
      status: 'success',
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
    });

    return {
      message: 'Your account is ready.',
      user: this.sanitizeUser(user),
      token: accessToken,
      refreshToken,
    };
  }

  async login(
    dto: LoginDto,
    meta?: { ip?: string; userAgent?: string },
  ) {
    const user = await this.usersService.findByEmail(dto.email);
    const isMatch = user ? await bcrypt.compare(dto.password, user.password) : false;

    if (!user || !isMatch) {
      await this.auditLogService.recordLog({
        userEmail: dto.email,
        action: 'auth.login_failed',
        status: 'denied',
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        details: { reason: 'Invalid credentials' },
      });
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.isActive === false) {
      throw new ForbiddenException('This account has been deactivated. Please contact support.');
    }

    const userRole = (user.role || 'customer').toLowerCase().trim();
    const isAdmin = ADMIN_ROLES.includes(userRole);
    const is2faActive = Boolean((user as any).two_factor_enabled || (user as any).twoFactorEnabled);

    // Two-Factor Authentication enforcement for Admins
    if (isAdmin && is2faActive) {
      const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
      const codeHash = hashToken(code);
      const expiresAt = new Date(Date.now() + TWO_FACTOR_CODE_TTL_MS).toISOString();

      await this.db
        .from('users')
        .update({
          two_factor_temp_code: codeHash,
          two_factor_temp_expires: expiresAt,
        })
        .eq('id', user.id);

      const tempToken = this.jwtService.sign(
        { sub: user.id, purpose: '2fa_pending' },
        { expiresIn: '10m' },
      );

      // Send 2FA verification email
      await this.smtpService.sendMail({
        to: user.email,
        subject: `${code} is your Lustre & Co. Admin Security Code`,
        html: `
          <div style="font-family:'DM Sans',Arial,sans-serif;max-width:540px;margin:auto;padding:24px;border:1px solid #ebd9c0;border-radius:12px;background:#ffffff;">
            <p style="color:#d6b56d;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 6px 0;">Lustre & Co. Security</p>
            <h2 style="color:#1c1917;margin:0 0 16px 0;">Two-Factor Authentication</h2>
            <p style="color:#57534e;font-size:14px;line-height:1.5;">Your single-use administrative verification code is:</p>
            <div style="text-align:center;margin:24px 0;padding:18px;background:#fbf7ee;border:1px dashed #d6b56d;border-radius:8px;">
              <span style="font-family:monospace;font-size:32px;font-weight:700;letter-spacing:6px;color:#1c1917;">${code}</span>
            </div>
            <p style="font-size:12px;color:#78716c;">This code will expire in 10 minutes. If you did not attempt to sign in to the administrative portal, please secure your account immediately.</p>
          </div>
        `,
        text: `Your Lustre & Co. Admin Security Code is: ${code}. It expires in 10 minutes.`,
      });

      return {
        requires2FA: true,
        tempToken,
        message: 'A 6-digit two-factor verification code was sent to your registered email.',
      };
    }

    await this.usersService.touchLastLogin(user.id);

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.createRefreshToken(user.id, meta);

    await this.auditLogService.recordLog({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'auth.login',
      resource: 'users',
      resourceId: user.id,
      status: 'success',
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
    });

    return {
      message: 'Welcome back.',
      user: this.sanitizeUser(user),
      token: accessToken,
      refreshToken,
    };
  }

  async verify2Fa(
    dto: Verify2faDto,
    meta?: { ip?: string; userAgent?: string },
  ) {
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.tempToken);
    } catch {
      throw new UnauthorizedException('Verification session expired or invalid. Please sign in again.');
    }

    if (payload.purpose !== '2fa_pending') {
      throw new UnauthorizedException('Invalid verification token.');
    }

    const { data: user, error } = await this.db
      .from('users')
      .select('*')
      .eq('id', payload.sub)
      .maybeSingle();

    if (error || !user) {
      throw new UnauthorizedException('User account not found.');
    }

    const codeHash = hashToken(dto.code.trim());
    const isMatch = user.two_factor_temp_code === codeHash;
    const isExpired = user.two_factor_temp_expires
      ? new Date(user.two_factor_temp_expires) < new Date()
      : true;

    if (!isMatch || isExpired) {
      await this.auditLogService.recordLog({
        userId: user.id,
        userEmail: user.email,
        action: 'auth.2fa_failed',
        status: 'denied',
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
      });
      throw new UnauthorizedException('Invalid or expired 2FA code. Please check your email.');
    }

    // Clear temp code after successful verification
    await this.db
      .from('users')
      .update({
        two_factor_temp_code: null,
        two_factor_temp_expires: null,
      })
      .eq('id', user.id);

    await this.usersService.touchLastLogin(user.id);

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.createRefreshToken(user.id, meta);

    await this.auditLogService.recordLog({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'auth.2fa_verify',
      resource: 'users',
      resourceId: user.id,
      status: 'success',
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
    });

    return {
      message: 'Authentication successful.',
      user: this.sanitizeUser(user),
      token: accessToken,
      refreshToken,
    };
  }

  async setup2Fa(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found.');

    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    const codeHash = hashToken(code);
    const expiresAt = new Date(Date.now() + TWO_FACTOR_CODE_TTL_MS).toISOString();

    await this.db
      .from('users')
      .update({
        two_factor_temp_code: codeHash,
        two_factor_temp_expires: expiresAt,
      })
      .eq('id', userId);

    await this.smtpService.sendMail({
      to: user.email,
      subject: `${code} - Enable Two-Factor Authentication`,
      html: `
        <div style="font-family:'DM Sans',Arial,sans-serif;max-width:540px;margin:auto;padding:24px;border:1px solid #ebd9c0;border-radius:12px;background:#ffffff;">
          <h2 style="color:#1c1917;">Activate 2FA Security</h2>
          <p>Enter the following 6-digit confirmation code in your administration panel to enable Two-Factor Authentication:</p>
          <div style="text-align:center;margin:24px 0;padding:16px;background:#fbf7ee;border:1px dashed #d6b56d;border-radius:8px;">
            <span style="font-family:monospace;font-size:32px;font-weight:700;letter-spacing:6px;color:#1c1917;">${code}</span>
          </div>
          <p style="font-size:12px;color:#78716c;">This code expires in 10 minutes.</p>
        </div>
      `,
      text: `Your 2FA setup code is: ${code}`,
    });

    return {
      success: true,
      message: 'A 6-digit activation code has been sent to your email.',
    };
  }

  async enable2Fa(userId: string, code: string) {
    const { data: user } = await this.db
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!user) throw new NotFoundException('User not found.');

    const codeHash = hashToken(code.trim());
    const isMatch = user.two_factor_temp_code === codeHash;
    const isExpired = user.two_factor_temp_expires
      ? new Date(user.two_factor_temp_expires) < new Date()
      : true;

    if (!isMatch || isExpired) {
      throw new BadRequestException('Invalid or expired confirmation code.');
    }

    await this.db
      .from('users')
      .update({
        two_factor_enabled: true,
        two_factor_temp_code: null,
        two_factor_temp_expires: null,
      })
      .eq('id', userId);

    await this.auditLogService.recordLog({
      userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'auth.2fa_enabled',
      resource: 'users',
      resourceId: userId,
      status: 'success',
    });

    return {
      success: true,
      message: 'Two-factor authentication is now active on your administrator account.',
    };
  }

  async disable2Fa(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found.');

    await this.db
      .from('users')
      .update({
        two_factor_enabled: false,
        two_factor_temp_code: null,
        two_factor_temp_expires: null,
      })
      .eq('id', userId);

    await this.auditLogService.recordLog({
      userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'auth.2fa_disabled',
      resource: 'users',
      resourceId: userId,
      status: 'success',
    });

    return {
      success: true,
      message: 'Two-factor authentication has been disabled.',
    };
  }

  async refreshTokens(
    refreshTokenStr: string,
    meta?: { ip?: string; userAgent?: string },
  ) {
    if (!refreshTokenStr) {
      throw new UnauthorizedException('Refresh token is required.');
    }

    const tokenHash = hashToken(refreshTokenStr.trim());

    const { data: record, error } = await this.db
      .from('auth_refresh_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (error || !record) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    // Token reuse / replay attack detection:
    // If a revoked token or previously replaced token is used again, invalidate all active tokens for that user!
    if (record.revoked || record.replaced_by_token_hash) {
      this.logger.warn(`Suspected refresh token reuse attack for user ${record.user_id}`);
      await this.db
        .from('auth_refresh_tokens')
        .update({ revoked: true })
        .eq('user_id', record.user_id);

      await this.auditLogService.recordLog({
        userId: record.user_id,
        action: 'auth.token_reuse_detected',
        status: 'denied',
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        details: { compromisedTokenId: record.id },
      });

      throw new UnauthorizedException(
        'Compromised session detected. All sessions for this account have been invalidated for your security. Please sign in again.',
      );
    }

    if (new Date(record.expires_at) < new Date()) {
      throw new UnauthorizedException('Refresh token has expired. Please sign in again.');
    }

    // Load active user
    const { data: user, error: userError } = await this.db
      .from('users')
      .select('*')
      .eq('id', record.user_id)
      .maybeSingle();

    if (userError || !user || user.isActive === false) {
      throw new UnauthorizedException('User account no longer active.');
    }

    // Generate new Access Token + new rotated Refresh Token
    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = randomBytes(40).toString('hex');
    const newHash = hashToken(newRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    // Mark old token as revoked and replaced by new token
    await this.db
      .from('auth_refresh_tokens')
      .update({
        revoked: true,
        replaced_by_token_hash: newHash,
      })
      .eq('id', record.id);

    // Insert new rotated token
    await this.db.from('auth_refresh_tokens').insert({
      user_id: user.id,
      token_hash: newHash,
      device_info: meta?.userAgent || null,
      ip_address: meta?.ip || null,
      expires_at: expiresAt.toISOString(),
      revoked: false,
    });

    return {
      token: newAccessToken,
      refreshToken: newRefreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async logout(
    refreshTokenStr?: string,
    userId?: string,
    meta?: { ip?: string; userAgent?: string },
  ) {
    if (refreshTokenStr) {
      const tokenHash = hashToken(refreshTokenStr.trim());
      await this.db
        .from('auth_refresh_tokens')
        .update({ revoked: true })
        .eq('token_hash', tokenHash);
    }

    if (userId) {
      await this.auditLogService.recordLog({
        userId,
        action: 'auth.logout',
        status: 'success',
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
      });
    }

    return { success: true, message: 'Signed out successfully.' };
  }

  async googleLogin(
    profile: any,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<{ user: any; token: string; refreshToken: string }> {
    let user: UserDocument | null = null;

    if (profile?.id && isUuid(profile.id)) {
      user = profile as UserDocument;
    } else {
      const googleId = profile?.googleId || profile?.id;
      const row = googleId
        ? unwrap(await this.db.from('users').select('*').eq('googleId', googleId).maybeSingle())
        : null;
      user = row ? (toDoc<any>(row) as UserDocument) : null;
    }

    if (!user || user.isActive === false) {
      throw new UnauthorizedException('Google account not found or deactivated.');
    }

    await this.usersService.touchLastLogin(user.id);
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.createRefreshToken(user.id, meta);

    return {
      user: this.sanitizeUser(user),
      token: accessToken,
      refreshToken,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (user && user.isActive !== false) {
      const token = crypto.randomBytes(32).toString('hex');
      unwrap(
        await this.db
          .from('users')
          .update({
            resetPasswordTokenHash: hashToken(token),
            resetPasswordExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString(),
          })
          .eq('id', user.id),
      );

      await this.smtpService.sendPasswordResetEmail(user.email, token);
    }

    return {
      success: true,
      message: 'If an account exists with this email address, a password reset link has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = unwrap(
      await this.db
        .from('users')
        .select('id')
        .eq('resetPasswordTokenHash', hashToken(dto.token.trim()))
        .gt('resetPasswordExpires', new Date().toISOString())
        .maybeSingle(),
    );

    if (!user) {
      throw new BadRequestException('This reset link is invalid or has expired. Please request a new one.');
    }

    unwrap(
      await this.db
        .from('users')
        .update({
          password: await bcrypt.hash(dto.password, 10),
          resetPasswordTokenHash: null,
          resetPasswordExpires: null,
        })
        .eq('id', user.id),
    );

    return { success: true, message: 'Your password has been reset. You can now sign in.' };
  }
}
