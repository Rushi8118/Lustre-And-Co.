import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { SelectedBundleItemDto } from './add-bundle-to-cart.dto.js';

export class ValidateBundleDto {
  @ApiProperty()
  @IsUUID()
  bundleId!: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ type: [SelectedBundleItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedBundleItemDto)
  selectedItems?: SelectedBundleItemDto[];
}
