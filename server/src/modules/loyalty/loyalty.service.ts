// server/src/modules/loyalty/loyalty.service.ts
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { SupabaseService } from '../../database/supabase.service.js';
import type { UpdateBirthdayDto } from './dto/update-birthday.dto.js';
import type { UpdateLoyaltySettingsDto } from './dto/update-loyalty-settings.dto.js';
import type { ReferralCodeDto } from './dto/referral-code.dto.js';
import type { RedeemPointsDto } from './dto/redeem-points.dto.js';
import type { AdminAdjustPointsDto } from './dto/admin-adjust-points.dto.js';
import type { UpdateLoyaltyTierDto } from './dto/update-loyalty-tier.dto.js';
import {
  DEFAULT_LOYALTY_SETTINGS,
  type LoyaltyAccount,
  type LoyaltySettings,
  type LoyaltyTier,
} from './schemas/loyalty.schema.js';

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(private readonly db: SupabaseService) {}

  // ──────────────────────────────────────────────────────────
  // Mappers
  // ──────────────────────────────────────────────────────────

  private mapTier(row: any): LoyaltyTier {
    return {
      id: row.id,
      name: row.name,
      minLifetimePoints: Number(row.min_lifetime_points || 0),
      minLifetimeSpend: Number(row.min_lifetime_spend || 0),
      pointsMultiplier: Number(row.points_multiplier || 1),
      birthdayMultiplier: Number(row.birthday_multiplier || 1),
      benefits: Array.isArray(row.benefits) ? row.benefits : [],
      sortOrder: Number(row.sort_order || 0),
      isActive: Boolean(row.is_active),
    };
  }

  private mapAccount(row: any, tier?: LoyaltyTier | null): LoyaltyAccount {
    return {
      id: row.id,
      userId: row.user_id,
      availablePoints: Number(row.available_points || 0),
      lifetimePoints: Number(row.lifetime_points || 0),
      redeemedPoints: Number(row.redeemed_points || 0),
      walletBalance: Number(row.wallet_balance || 0),
      lifetimeSpend: Number(row.lifetime_spend || 0),
      referralCode: row.referral_code,
      referredByUserId: row.referred_by_user_id ?? null,
      referralCompletedAt: row.referral_completed_at ?? null,
      birthdayMonth: row.birthday_month ?? null,
      birthdayDay: row.birthday_day ?? null,
      birthdayYear: row.birthday_year ?? null,
      currentTier: tier ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ──────────────────────────────────────────────────────────
  // Settings
  // ──────────────────────────────────────────────────────────

  private async loadSettings(): Promise<LoyaltySettings> {
    const { data, error } = await this.db.client
      .from('loyalty_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data) return { ...DEFAULT_LOYALTY_SETTINGS };

    return {
      enabled: Boolean(data.enabled),
      pointsPerCurrency: Number(data.points_per_currency || 0),
      currencyUnit: Number(data.currency_unit || 1),
      reviewPoints: Number(data.review_points || 0),
      referralInviterPoints: Number(data.referral_inviter_points || 0),
      referralFriendPoints: Number(data.referral_friend_points || 0),
      birthdayPoints: Number(data.birthday_points || 0),
      minimumReferralOrderAmount: Number(data.minimum_referral_order_amount || 0),
      pointsExpireDays: data.points_expire_days == null ? null : Number(data.points_expire_days),
      birthdayRewardEnabled: Boolean(data.birthday_reward_enabled),
      reviewRewardEnabled: Boolean(data.review_reward_enabled),
      referralRewardEnabled: Boolean(data.referral_reward_enabled),
    };
  }

  async getAdminSettings() {
    return this.loadSettings();
  }

  async updateSettings(dto: UpdateLoyaltySettingsDto) {
    const current = await this.loadSettings();
    const next = { ...current, ...Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined)) };

    const { error } = await this.db.client
      .from('loyalty_settings')
      .upsert({
        id: 1,
        enabled: next.enabled,
        points_per_currency: next.pointsPerCurrency,
        currency_unit: next.currencyUnit,
        review_points: next.reviewPoints,
        referral_inviter_points: next.referralInviterPoints,
        referral_friend_points: next.referralFriendPoints,
        birthday_points: next.birthdayPoints,
        minimum_referral_order_amount: next.minimumReferralOrderAmount,
        points_expire_days: next.pointsExpireDays,
        birthday_reward_enabled: next.birthdayRewardEnabled,
        review_reward_enabled: next.reviewRewardEnabled,
        referral_reward_enabled: next.referralRewardEnabled,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) throw new BadRequestException(error.message);
    return next;
  }

  // ──────────────────────────────────────────────────────────
  // Tiers
  // ──────────────────────────────────────────────────────────

  async getTiers(includeInactive = false): Promise<LoyaltyTier[]> {
    let q = this.db.client.from('loyalty_tiers').select('*').order('sort_order', { ascending: true });
    if (!includeInactive) q = q.eq('is_active', true);
    const { data, error } = await q;
    if (error) throw new BadRequestException(error.message);
    return (data || []).map((r) => this.mapTier(r));
  }

  async getTierById(id: string): Promise<LoyaltyTier> {
    const { data, error } = await this.db.client.from('loyalty_tiers').select('*').eq('id', id).maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Loyalty tier not found.');
    return this.mapTier(data);
  }

  async updateTier(id: string, dto: UpdateLoyaltyTierDto) {
    const payload: Record<string, unknown> = {};
    if (dto.name !== undefined) payload.name = dto.name.trim();
    if (dto.minLifetimePoints !== undefined) payload.min_lifetime_points = dto.minLifetimePoints;
    if (dto.minLifetimeSpend !== undefined) payload.min_lifetime_spend = dto.minLifetimeSpend;
    if (dto.pointsMultiplier !== undefined) payload.points_multiplier = dto.pointsMultiplier;
    if (dto.birthdayMultiplier !== undefined) payload.birthday_multiplier = dto.birthdayMultiplier;
    if (dto.benefits !== undefined) payload.benefits = dto.benefits;
    if (dto.sortOrder !== undefined) payload.sort_order = dto.sortOrder;
    if (dto.isActive !== undefined) payload.is_active = dto.isActive;
    if (!Object.keys(payload).length) return this.getTierById(id);

    const { data, error } = await this.db.client.from('loyalty_tiers').update(payload).eq('id', id).select('*').single();
    if (error) throw new BadRequestException(error.message);
    return this.mapTier(data);
  }

  // ──────────────────────────────────────────────────────────
  // Account management
  // ──────────────────────────────────────────────────────────

  private generateReferralCode(): string {
    return `LUSTRE-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  private async createUniqueCode(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const code = this.generateReferralCode();
      const { data } = await this.db.client.from('loyalty_accounts').select('id').eq('referral_code', code).maybeSingle();
      if (!data) return code;
    }
    throw new BadRequestException('Could not generate a unique referral code.');
  }

  private async resolveCurrentTier(lifetimePoints: number, lifetimeSpend: number): Promise<LoyaltyTier | null> {
    const tiers = await this.getTiers();
    const eligible = tiers.filter((t) => lifetimePoints >= t.minLifetimePoints && lifetimeSpend >= t.minLifetimeSpend);
    eligible.sort((a, b) => b.minLifetimePoints - a.minLifetimePoints || b.minLifetimeSpend - a.minLifetimeSpend || b.sortOrder - a.sortOrder);
    return eligible[0] ?? null;
  }

  private async ensureAccount(userId: string) {
    const { data: existing } = await this.db.client.from('loyalty_accounts').select('*').eq('user_id', userId).maybeSingle();
    if (existing) return existing;

    const code = await this.createUniqueCode();
    const { data, error } = await this.db.client.from('loyalty_accounts').insert({ user_id: userId, referral_code: code }).select('*').single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getAccount(userId: string): Promise<LoyaltyAccount> {
    const row = await this.ensureAccount(userId);
    const tier = await this.resolveCurrentTier(Number(row.lifetime_points || 0), Number(row.lifetime_spend || 0));

    if (tier && row.current_tier_id !== tier.id) {
      const { data: updated } = await this.db.client.from('loyalty_accounts').update({ current_tier_id: tier.id, updated_at: new Date().toISOString() }).eq('id', row.id).select('*').single();
      return this.mapAccount(updated || row, tier);
    }

    return this.mapAccount(row, tier);
  }

  async getLedger(userId: string, page = 1, limit = 30) {
    const p = Math.max(1, page);
    const l = Math.min(100, Math.max(1, limit));
    const from = (p - 1) * l;

    const { data, error, count } = await this.db.client
      .from('loyalty_ledger')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, from + l - 1);

    if (error) throw new BadRequestException(error.message);

    return {
      entries: (data || []).map((r) => ({
        id: r.id,
        userId: r.user_id,
        transactionType: r.transaction_type,
        points: Number(r.points || 0),
        walletAmount: Number(r.wallet_amount || 0),
        orderId: r.order_id ?? null,
        referredUserId: r.referred_user_id ?? null,
        idempotencyKey: r.idempotency_key,
        description: r.description ?? null,
        expiresAt: r.expires_at ?? null,
        createdAt: r.created_at,
      })),
      total: count || 0,
      page: p,
      limit: l,
      totalPages: Math.max(1, Math.ceil((count || 0) / l)),
    };
  }

  // ──────────────────────────────────────────────────────────
  // Core point award (idempotent)
  // ──────────────────────────────────────────────────────────

  private async addPointsCore(input: {
    userId: string;
    points: number;
    transactionType: string;
    idempotencyKey: string;
    description: string;
    walletAmount?: number;
    orderId?: string;
    referredUserId?: string;
    force?: boolean;
  }) {
    if (!input.points && !input.walletAmount) return this.getAccount(input.userId);

    // Idempotency check
    const { data: existing } = await this.db.client.from('loyalty_ledger').select('id').eq('idempotency_key', input.idempotencyKey).maybeSingle();
    if (existing) return this.getAccount(input.userId);

    const settings = await this.loadSettings();
    if (!settings.enabled && !input.force) return this.getAccount(input.userId);

    const row = await this.ensureAccount(input.userId);
    const tier = await this.resolveCurrentTier(Number(row.lifetime_points || 0), Number(row.lifetime_spend || 0));
    const multiplier = input.transactionType === 'birthday' ? Number(tier?.birthdayMultiplier || 1) : Number(tier?.pointsMultiplier || 1);
    const awarded = Math.floor(input.points * multiplier);

    const expiresAt = settings.pointsExpireDays && awarded > 0
      ? new Date(Date.now() + settings.pointsExpireDays * 86_400_000).toISOString()
      : null;

    const { error: ledgerErr } = await this.db.client.from('loyalty_ledger').insert({
      user_id: input.userId,
      transaction_type: input.transactionType,
      points: awarded,
      wallet_amount: input.walletAmount || 0,
      order_id: input.orderId ?? null,
      referred_user_id: input.referredUserId ?? null,
      idempotency_key: input.idempotencyKey,
      description: input.description,
      expires_at: expiresAt,
    });

    if (ledgerErr) {
      if (ledgerErr.code === '23505') return this.getAccount(input.userId); // race condition
      throw new BadRequestException(ledgerErr.message);
    }

    const newAvailable = Math.max(0, Number(row.available_points || 0) + awarded);
    const newLifetime  = Math.max(0, Number(row.lifetime_points  || 0) + Math.max(0, awarded));
    const newWallet    = Number(row.wallet_balance || 0) + Number(input.walletAmount || 0);

    await this.db.client.from('loyalty_accounts').update({
      available_points: newAvailable,
      lifetime_points:  newLifetime,
      wallet_balance:   newWallet,
      updated_at: new Date().toISOString(),
    }).eq('user_id', input.userId);

    // Recalculate tier
    const newTier = await this.resolveCurrentTier(newLifetime, Number(row.lifetime_spend || 0));
    if (newTier) await this.db.client.from('loyalty_accounts').update({ current_tier_id: newTier.id, updated_at: new Date().toISOString() }).eq('user_id', input.userId);

    return this.getAccount(input.userId);
  }

  // ──────────────────────────────────────────────────────────
  // Purchase points
  // ──────────────────────────────────────────────────────────

  async awardPurchasePoints(input: { userId: string; orderId: string; orderTotal: number }) {
    const settings = await this.loadSettings();
    if (!settings.enabled) return this.getAccount(input.userId);

    const row = await this.ensureAccount(input.userId);
    const tier = await this.resolveCurrentTier(Number(row.lifetime_points || 0), Number(row.lifetime_spend || 0));
    const basePoints = Math.floor((Number(input.orderTotal || 0) / Math.max(settings.currencyUnit, 0.01)) * settings.pointsPerCurrency);
    const awarded = Math.floor(basePoints * Number(tier?.pointsMultiplier || 1));

    const key = `purchase:${input.orderId}`;
    const { data: existing } = await this.db.client.from('loyalty_ledger').select('id').eq('idempotency_key', key).maybeSingle();
    if (existing) return this.getAccount(input.userId);

    const expiresAt = settings.pointsExpireDays && awarded > 0
      ? new Date(Date.now() + settings.pointsExpireDays * 86_400_000).toISOString()
      : null;

    const { error: le } = await this.db.client.from('loyalty_ledger').insert({
      user_id: input.userId, transaction_type: 'purchase', points: awarded, wallet_amount: 0,
      order_id: input.orderId, idempotency_key: key,
      description: `Points earned for order ${input.orderId}`, expires_at: expiresAt,
    });
    if (le) { if (le.code === '23505') return this.getAccount(input.userId); throw new BadRequestException(le.message); }

    const nextLifetimePoints = Number(row.lifetime_points || 0) + awarded;
    const nextLifetimeSpend  = Number(row.lifetime_spend  || 0) + Number(input.orderTotal || 0);

    await this.db.client.from('loyalty_accounts').update({
      available_points: Number(row.available_points || 0) + awarded,
      lifetime_points:  nextLifetimePoints,
      lifetime_spend:   nextLifetimeSpend,
      updated_at: new Date().toISOString(),
    }).eq('user_id', input.userId);

    const newTier = await this.resolveCurrentTier(nextLifetimePoints, nextLifetimeSpend);
    if (newTier) await this.db.client.from('loyalty_accounts').update({ current_tier_id: newTier.id, updated_at: new Date().toISOString() }).eq('user_id', input.userId);

    return this.getAccount(input.userId);
  }

  // ──────────────────────────────────────────────────────────
  // Review points
  // ──────────────────────────────────────────────────────────

  async awardReviewPoints(input: { userId: string; reviewId: string; productId?: string }) {
    const settings = await this.loadSettings();
    if (!settings.enabled || !settings.reviewRewardEnabled) return this.getAccount(input.userId);

    return this.addPointsCore({
      userId: input.userId,
      points: settings.reviewPoints,
      transactionType: 'review',
      idempotencyKey: `review:${input.reviewId}`,
      description: 'Points earned for submitting a product review.',
    });
  }

  // ──────────────────────────────────────────────────────────
  // Birthday
  // ──────────────────────────────────────────────────────────

  async setBirthday(userId: string, dto: UpdateBirthdayDto) {
    const date = new Date(dto.year, dto.month - 1, dto.day);
    if (date.getFullYear() !== dto.year || date.getMonth() !== dto.month - 1 || date.getDate() !== dto.day) {
      throw new BadRequestException('Invalid birthday date.');
    }
    await this.ensureAccount(userId);
    const { error } = await this.db.client.from('loyalty_accounts').update({ birthday_month: dto.month, birthday_day: dto.day, birthday_year: dto.year, updated_at: new Date().toISOString() }).eq('user_id', userId);
    if (error) throw new BadRequestException(error.message);
    return this.getAccount(userId);
  }

  async awardBirthdayPointsForUser(userId: string) {
    const settings = await this.loadSettings();
    if (!settings.enabled || !settings.birthdayRewardEnabled) return this.getAccount(userId);

    const row = await this.ensureAccount(userId);
    const now = new Date();
    if (!row.birthday_month || !row.birthday_day) return this.getAccount(userId);
    if (Number(row.birthday_month) !== now.getMonth() + 1 || Number(row.birthday_day) !== now.getDate()) return this.getAccount(userId);

    const currentYear = now.getFullYear();
    if (Number(row.birthday_reward_year || 0) === currentYear) return this.getAccount(userId);

    const result = await this.addPointsCore({
      userId, points: settings.birthdayPoints, transactionType: 'birthday',
      idempotencyKey: `birthday:${userId}:${currentYear}`,
      description: `Birthday reward for ${currentYear}.`,
    });

    await this.db.client.from('loyalty_accounts').update({ birthday_reward_year: currentYear, updated_at: new Date().toISOString() }).eq('user_id', userId);
    return result;
  }

  // ──────────────────────────────────────────────────────────
  // Referrals
  // ──────────────────────────────────────────────────────────

  async createReferralEvent(code: string, input?: { email?: string; sessionId?: string; landingPage?: string }) {
    const normalized = code.trim().toUpperCase();
    const { data: account, error } = await this.db.client.from('loyalty_accounts').select('user_id, referral_code').eq('referral_code', normalized).maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!account) throw new NotFoundException('Referral code not found.');

    const { data, error: ie } = await this.db.client.from('referral_events').insert({
      inviter_user_id: account.user_id, referral_code: normalized,
      email: input?.email ?? null, session_id: input?.sessionId ?? null, landing_page: input?.landingPage ?? null,
      status: 'clicked',
    }).select('*').single();

    if (ie) throw new BadRequestException(ie.message);
    return { success: true, referralEventId: data.id, inviterUserId: account.user_id };
  }

  async applyReferralCode(userId: string, dto: ReferralCodeDto) {
    const normalized = dto.code.trim().toUpperCase();
    const row = await this.ensureAccount(userId);
    if (row.referred_by_user_id) throw new BadRequestException('A referral code has already been applied to this account.');

    const { data: inviter, error } = await this.db.client.from('loyalty_accounts').select('*').eq('referral_code', normalized).maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!inviter) throw new NotFoundException('Referral code not found.');
    if (inviter.user_id === userId) throw new BadRequestException('You cannot use your own referral code.');

    const { data: existing } = await this.db.client.from('referral_events').select('*').eq('referred_user_id', userId).in('status', ['registered', 'qualified', 'rewarded']).maybeSingle();
    if (existing) throw new BadRequestException('This account already belongs to a referral.');

    await this.db.client.from('loyalty_accounts').update({ referred_by_user_id: inviter.user_id, updated_at: new Date().toISOString() }).eq('user_id', userId);

    const { data: ev, error: ie } = await this.db.client.from('referral_events').insert({
      inviter_user_id: inviter.user_id, referred_user_id: userId, referral_code: normalized, status: 'registered',
    }).select('*').single();
    if (ie) throw new BadRequestException(ie.message);

    return { success: true, referralEventId: ev.id, inviterUserId: inviter.user_id };
  }

  async qualifyReferralFromOrder(input: { userId: string; orderId: string; orderTotal: number }) {
    const settings = await this.loadSettings();
    if (!settings.enabled || !settings.referralRewardEnabled) return { qualified: false, reason: 'Referral rewards are disabled.' };
    if (Number(input.orderTotal || 0) < settings.minimumReferralOrderAmount) return { qualified: false, reason: 'Order does not meet the referral minimum.' };

    const referredRow = await this.ensureAccount(input.userId);
    if (!referredRow.referred_by_user_id) return { qualified: false, reason: 'Customer was not referred.' };

    const { data: referral } = await this.db.client.from('referral_events').select('*').eq('referred_user_id', input.userId).in('status', ['registered', 'qualified']).maybeSingle();
    if (!referral) return { qualified: false, reason: 'Referral record not found.' };
    if (referral.status === 'qualified') return { qualified: false, reason: 'Referral already qualified.' };

    const inviterId = referredRow.referred_by_user_id;

    await this.addPointsCore({ userId: inviterId, points: settings.referralInviterPoints, transactionType: 'referral_inviter', idempotencyKey: `referral-inviter:${referral.id}`, description: 'Referral reward for inviting a customer.', referredUserId: input.userId });
    await this.addPointsCore({ userId: input.userId, points: settings.referralFriendPoints, transactionType: 'referral_friend', idempotencyKey: `referral-friend:${referral.id}`, description: 'Welcome reward for joining through a referral.', referredUserId: inviterId });

    const now = new Date().toISOString();
    await this.db.client.from('referral_events').update({ status: 'rewarded', qualified_order_id: input.orderId, qualified_at: now, rewarded_at: now }).eq('id', referral.id);
    await this.db.client.from('loyalty_accounts').update({ referral_completed_at: now, updated_at: now }).eq('user_id', input.userId);

    return { qualified: true, inviterId, referredUserId: input.userId };
  }

  async getReferralSummary(userId: string) {
    const row = await this.ensureAccount(userId);
    const { data, error } = await this.db.client.from('referral_events').select('*').eq('inviter_user_id', userId).order('created_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);

    return {
      referralCode: row.referral_code,
      referrals: data || [],
      total: data?.length || 0,
      rewarded: (data || []).filter((r: any) => r.status === 'rewarded').length,
    };
  }

  // ──────────────────────────────────────────────────────────
  // Redemption
  // ──────────────────────────────────────────────────────────

  async redeemPoints(userId: string, dto: RedeemPointsDto) {
    const settings = await this.loadSettings();
    if (!settings.enabled) throw new BadRequestException('The loyalty program is currently disabled.');

    const row = await this.ensureAccount(userId);
    const points = Math.floor(dto.points);
    if (points <= 0) throw new BadRequestException('Points must be greater than zero.');
    if (points > Number(row.available_points || 0)) throw new BadRequestException('Insufficient points balance.');

    const key = dto.idempotencyKey || `redemption:${userId}:${Date.now()}:${points}`;
    const { data: existing } = await this.db.client.from('loyalty_ledger').select('id').eq('idempotency_key', key).maybeSingle();
    if (existing) return this.getAccount(userId);

    const walletAmount = (points * Math.max(settings.currencyUnit, 0.01)) / Math.max(settings.pointsPerCurrency, 0.01);

    const { error: le } = await this.db.client.from('loyalty_ledger').insert({
      user_id: userId, transaction_type: 'redemption', points: -points, wallet_amount: walletAmount,
      idempotency_key: key, description: 'Points converted to wallet balance.',
    });
    if (le) throw new BadRequestException(le.message);

    await this.db.client.from('loyalty_redemptions').insert({
      user_id: userId, points, wallet_amount: walletAmount, idempotency_key: key, status: 'completed',
    });

    await this.db.client.from('loyalty_accounts').update({
      available_points: Number(row.available_points || 0) - points,
      redeemed_points:  Number(row.redeemed_points  || 0) + points,
      wallet_balance:   Number(row.wallet_balance   || 0) + walletAmount,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId);

    return this.getAccount(userId);
  }

  // ──────────────────────────────────────────────────────────
  // Admin
  // ──────────────────────────────────────────────────────────

  async adminAdjustPoints(dto: AdminAdjustPointsDto) {
    const row = await this.ensureAccount(dto.userId);
    if (dto.points < 0 && Math.abs(dto.points) > Number(row.available_points || 0)) {
      throw new BadRequestException('Adjustment would make the balance negative.');
    }
    return this.addPointsCore({
      userId: dto.userId, points: dto.points, transactionType: 'admin_adjustment',
      idempotencyKey: `admin:${dto.userId}:${Date.now()}:${Math.random()}`,
      description: dto.description || 'Manual administrator adjustment.', force: true,
    });
  }

  // ──────────────────────────────────────────────────────────
  // Scheduled jobs
  // ──────────────────────────────────────────────────────────

  async processBirthdayRewards() {
    const settings = await this.loadSettings();
    if (!settings.enabled || !settings.birthdayRewardEnabled) return { processed: 0, rewarded: 0 };

    const now = new Date();
    const { data, error } = await this.db.client.from('loyalty_accounts').select('user_id').eq('birthday_month', now.getMonth() + 1).eq('birthday_day', now.getDate());
    if (error) throw new BadRequestException(error.message);

    let rewarded = 0;
    for (const row of data || []) {
      try {
        const before = await this.getAccount(row.user_id);
        await this.awardBirthdayPointsForUser(row.user_id);
        const after = await this.getAccount(row.user_id);
        if (after.availablePoints > before.availablePoints) rewarded++;
      } catch (err) {
        this.logger.error(`Birthday reward failed for ${row.user_id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    return { processed: data?.length || 0, rewarded };
  }

  async expirePoints() {
    const now = new Date().toISOString();
    const { data, error } = await this.db.client.from('loyalty_ledger').select('*').lt('expires_at', now).gt('points', 0);
    if (error) throw new BadRequestException(error.message);

    let expired = 0;
    for (const entry of data || []) {
      const key = `expiration:${entry.id}`;
      const { data: existing } = await this.db.client.from('loyalty_ledger').select('id').eq('idempotency_key', key).maybeSingle();
      if (existing) continue;

      const row = await this.ensureAccount(entry.user_id);
      const toExpire = Math.min(Number(entry.points || 0), Number(row.available_points || 0));
      if (toExpire <= 0) continue;

      const { error: le } = await this.db.client.from('loyalty_ledger').insert({
        user_id: entry.user_id, transaction_type: 'expiration', points: -toExpire, wallet_amount: 0,
        idempotency_key: key, description: 'Expired reward points.',
      });
      if (le) continue;

      await this.db.client.from('loyalty_accounts').update({ available_points: Number(row.available_points || 0) - toExpire, updated_at: new Date().toISOString() }).eq('user_id', entry.user_id);
      expired++;
    }

    return { processed: data?.length || 0, expired };
  }
}
