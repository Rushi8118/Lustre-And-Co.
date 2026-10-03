// server/src/modules/loyalty/dto/update-loyalty-settings.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateLoyaltySettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enabled?: boolean;

  @ApiPropertyOptional({ example: 1 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  pointsPerCurrency?: number;

  @ApiPropertyOptional({ example: 1 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01)
  currencyUnit?: number;

  @ApiPropertyOptional({ example: 50 }) @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  reviewPoints?: number;

  @ApiPropertyOptional({ example: 500 }) @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  referralInviterPoints?: number;

  @ApiPropertyOptional({ example: 250 }) @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  referralFriendPoints?: number;

  @ApiPropertyOptional({ example: 200 }) @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  birthdayPoints?: number;

  @ApiPropertyOptional({ example: 500 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  minimumReferralOrderAmount?: number;

  @ApiPropertyOptional({ example: 365 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(3650)
  pointsExpireDays?: number | null;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() birthdayRewardEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() reviewRewardEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() referralRewardEnabled?: boolean;
}
