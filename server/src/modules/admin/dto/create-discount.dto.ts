import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminCreateDiscountDto {
  @ApiProperty({ example: 'DIWALI25' })
  @IsString()
  @IsNotEmpty({ message: 'Coupon code is required.' })
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'Coupon codes may only contain letters, numbers, - and _.' })
  code: string;

  @ApiProperty({ example: 'percentage', enum: ['percentage', 'fixed', 'free_shipping'] })
  @IsIn(['percentage', 'fixed', 'free_shipping'], {
    message: 'Type must be percentage, fixed, or free_shipping.',
  })
  type: string;

  @ApiProperty({ example: 0.25, description: '0.25 for 25% (percentage), or 250 for ₹250 off (fixed)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Discount value must be at least 0.' })
  value: number;

  @ApiPropertyOptional({ example: 'Festive season offer' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1999, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: 500, default: 0, description: '0 = unlimited' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  usageLimit?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '2026-12-31', nullable: true, description: 'null clears the expiry' })
  @IsOptional()
  @ValidateIf((o) => o.expiresAt !== null)
  @IsString()
  expiresAt?: string | null;
}
