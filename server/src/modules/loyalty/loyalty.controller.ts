// server/src/modules/loyalty/loyalty.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../../common/decorators/admin-only.decorator.js';
import { LoyaltyService } from './loyalty.service.js';
import { AdminAdjustPointsDto } from './dto/admin-adjust-points.dto.js';
import { ReferralCodeDto } from './dto/referral-code.dto.js';
import { RedeemPointsDto } from './dto/redeem-points.dto.js';
import { UpdateBirthdayDto } from './dto/update-birthday.dto.js';
import { UpdateLoyaltySettingsDto } from './dto/update-loyalty-settings.dto.js';
import { UpdateLoyaltyTierDto } from './dto/update-loyalty-tier.dto.js';

function extractUserId(req: any): string | null {
  return req?.user?.sub ?? req?.user?.id ?? null;
}

@ApiTags('Loyalty & Referrals')
@Controller()
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  // ── Public ────────────────────────────────────────────────

  @Get('loyalty/tiers')
  @ApiOperation({ summary: 'List active loyalty tiers' })
  getTiers() {
    return this.loyaltyService.getTiers();
  }

  @Post('referrals/track')
  @ApiOperation({ summary: 'Track a referral link click (public)' })
  trackReferral(@Body() body: { code: string; email?: string; sessionId?: string; landingPage?: string }) {
    return this.loyaltyService.createReferralEvent(body.code, {
      email: body.email, sessionId: body.sessionId, landingPage: body.landingPage,
    });
  }

  // ── Customer (auth required via global JWT guard) ─────────

  @Get('loyalty/account')
  @ApiOperation({ summary: 'Get current customer loyalty account' })
  getAccount(@Req() req: any) {
    const userId = extractUserId(req);
    if (!userId) return null;
    return this.loyaltyService.getAccount(userId);
  }

  @Get('loyalty/ledger')
  @ApiOperation({ summary: 'Get points ledger history' })
  getLedger(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    const userId = extractUserId(req);
    if (!userId) return { entries: [], total: 0, page: 1, limit: 30, totalPages: 1 };
    return this.loyaltyService.getLedger(userId, Number(page || 1), Number(limit || 30));
  }

  @Put('loyalty/birthday')
  @ApiOperation({ summary: 'Set birthday for birthday rewards' })
  updateBirthday(@Req() req: any, @Body() dto: UpdateBirthdayDto) {
    const userId = extractUserId(req);
    if (!userId) return null;
    return this.loyaltyService.setBirthday(userId, dto);
  }

  @Post('loyalty/redeem')
  @ApiOperation({ summary: 'Convert points to wallet balance' })
  redeemPoints(@Req() req: any, @Body() dto: RedeemPointsDto) {
    const userId = extractUserId(req);
    if (!userId) return null;
    return this.loyaltyService.redeemPoints(userId, dto);
  }

  @Post('loyalty/referral/apply')
  @ApiOperation({ summary: 'Apply a referral code to the current account' })
  applyReferralCode(@Req() req: any, @Body() dto: ReferralCodeDto) {
    const userId = extractUserId(req);
    if (!userId) return null;
    return this.loyaltyService.applyReferralCode(userId, dto);
  }

  @Get('loyalty/referrals')
  @ApiOperation({ summary: 'Get referral summary for current user' })
  getReferralSummary(@Req() req: any) {
    const userId = extractUserId(req);
    if (!userId) return { referralCode: null, referrals: [], total: 0, rewarded: 0 };
    return this.loyaltyService.getReferralSummary(userId);
  }

  // ── Admin ─────────────────────────────────────────────────

  @AdminOnly() @Get('loyalty/admin/settings') @ApiOperation({ summary: 'Get loyalty settings (admin)' })
  getAdminSettings() { return this.loyaltyService.getAdminSettings(); }

  @AdminOnly() @Put('loyalty/admin/settings') @ApiOperation({ summary: 'Update loyalty settings (admin)' })
  updateSettings(@Body() dto: UpdateLoyaltySettingsDto) { return this.loyaltyService.updateSettings(dto); }

  @AdminOnly() @Get('loyalty/admin/tiers') @ApiOperation({ summary: 'List all tiers including inactive (admin)' })
  getAdminTiers() { return this.loyaltyService.getTiers(true); }

  @AdminOnly() @Put('loyalty/admin/tiers/:id') @ApiOperation({ summary: 'Update a loyalty tier (admin)' })
  updateTier(@Param('id') id: string, @Body() dto: UpdateLoyaltyTierDto) { return this.loyaltyService.updateTier(id, dto); }

  @AdminOnly() @Post('loyalty/admin/adjust') @ApiOperation({ summary: 'Manually adjust customer points (admin)' })
  adminAdjustPoints(@Body() dto: AdminAdjustPointsDto) { return this.loyaltyService.adminAdjustPoints(dto); }

  @AdminOnly() @Post('loyalty/admin/process-birthdays') @ApiOperation({ summary: 'Trigger birthday rewards job (admin)' })
  processBirthdays() { return this.loyaltyService.processBirthdayRewards(); }

  @AdminOnly() @Post('loyalty/admin/expire-points') @ApiOperation({ summary: 'Trigger points expiration job (admin)' })
  expirePoints() { return this.loyaltyService.expirePoints(); }
}
