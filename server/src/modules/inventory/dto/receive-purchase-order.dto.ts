import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsUUID, Min, ValidateNested } from 'class-validator';

export class ReceivePurchaseOrderItemDto {
  @ApiProperty() @IsUUID() productId!: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) quantity!: number;
}

export class ReceivePurchaseOrderDto {
  @ApiProperty({ type: [ReceivePurchaseOrderItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => ReceivePurchaseOrderItemDto)
  items!: ReceivePurchaseOrderItemDto[];
  @ApiPropertyOptional() @IsOptional() @IsUUID() warehouseId?: string;
}
