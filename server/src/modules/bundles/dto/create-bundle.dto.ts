import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import type {
  BundleDiscountType,
  BundleType,
} from '../schemas/product-bundle.schema.js';

export class CreateBundleItemDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupKey?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateBundleDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: [
      'fixed_bundle',
      'gift_set',
      'starter_kit',
      'frequently_bought_together',
      'mix_and_match',
      'bogo',
    ],
  })
  @IsEnum([
    'fixed_bundle',
    'gift_set',
    'starter_kit',
    'frequently_bought_together',
    'mix_and_match',
    'bogo',
  ])
  bundleType!: BundleType;

  @ApiProperty({ enum: ['percentage', 'fixed', 'free_item'] })
  @IsEnum(['percentage', 'fixed', 'free_item'])
  discountType!: BundleDiscountType;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1000000)
  discountValue!: number;

  @ApiPropertyOptional({ default: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minItems?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxItems?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  buyQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  getQuantity?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiProperty({ type: [CreateBundleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBundleItemDto)
  items!: CreateBundleItemDto[];
}
