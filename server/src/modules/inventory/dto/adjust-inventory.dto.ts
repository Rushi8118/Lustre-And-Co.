import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

const ADJUSTMENT_TYPES = [
  'opening_stock','purchase_received','manual_adjustment',
  'damage','damage_reversal','return','refund_restock','write_off',
] as const;

export class AdjustInventoryDto {
  @ApiProperty() @IsUUID() productId!: string;
  @ApiProperty({ example: 25 }) @Type(() => Number) @IsInt() quantity!: number;
  @ApiProperty({ enum: ADJUSTMENT_TYPES }) @IsIn(ADJUSTMENT_TYPES) movementType!: string;
  @ApiProperty() @IsString() reason!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() idempotencyKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() warehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() locationId?: string;
}
