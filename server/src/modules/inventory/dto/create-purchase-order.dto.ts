import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class PurchaseOrderItemDto {
  @ApiProperty() @IsUUID() productId!: string;
  @ApiProperty() @Type(() => Number) @Min(1) quantity!: number;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) unitCost!: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty() @IsUUID() supplierId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() warehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedDeliveryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiProperty({ type: [PurchaseOrderItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => PurchaseOrderItemDto)
  items!: PurchaseOrderItemDto[];
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) tax?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) shipping?: number;
}
