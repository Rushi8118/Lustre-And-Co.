import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateAbandonedCartSettingsDto {
  @ApiPropertyOptional({ description: 'Whether abandoned cart tracking and recovery is enabled' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Inactivity threshold in minutes before a cart is marked abandoned',
    example: 60,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(5, { message: 'Inactivity threshold must be at least 5 minutes' })
  @Max(10080, { message: 'Inactivity threshold cannot exceed 7 days (10080 minutes)' })
  abandonmentThresholdMinutes?: number;

  @ApiPropertyOptional({ description: 'Whether to automatically send recovery emails via the background scheduler' })
  @IsOptional()
  @IsBoolean()
  autoRecoveryEmail?: boolean;

  @ApiPropertyOptional({
    description: 'Hours after cart abandonment before sending the automated reminder email',
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5, { message: 'Reminder delay must be at least 0.5 hours' })
  @Max(168, { message: 'Reminder delay cannot exceed 7 days (168 hours)' })
  reminderDelayHours?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of recovery emails to send per abandoned cart',
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Max emails per cart must be at least 1' })
  @Max(5, { message: 'Max emails per cart cannot exceed 5' })
  maxEmailsPerCart?: number;

  @ApiPropertyOptional({ description: 'Promo coupon code to offer in recovery email', example: 'LUSTRE10' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ description: 'Discount percentage offered in the email', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @ApiPropertyOptional({ description: 'Email subject line' })
  @IsOptional()
  @IsString()
  emailSubject?: string;

  @ApiPropertyOptional({ description: 'Email headline or banner text' })
  @IsOptional()
  @IsString()
  emailHeadline?: string;

  @ApiPropertyOptional({ description: 'Custom body text for the recovery email' })
  @IsOptional()
  @IsString()
  emailBody?: string;
}
