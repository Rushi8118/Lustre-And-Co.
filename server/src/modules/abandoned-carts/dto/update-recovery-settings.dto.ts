import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateAbandonedCartSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(5)
  @Max(10080)
  abandonmentThresholdMinutes?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(168)
  firstReminderDelayHours?: number;

  @ApiPropertyOptional({ example: 48 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(336)
  secondReminderDelayHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoRecoveryEmail?: boolean;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  couponPercentage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstReminderSubject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstReminderHeadline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstReminderBody?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secondReminderSubject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secondReminderHeadline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secondReminderBody?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  senderEmail?: string;
}
