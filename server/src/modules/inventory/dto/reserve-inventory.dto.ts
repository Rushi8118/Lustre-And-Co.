import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class InventoryReservationItemDto {
  @ApiProperty() @IsUUID() productId!: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) quantity!: number;
}

export class ReserveInventoryDto {
  @ApiProperty() @IsString() reservationToken!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() cartId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() userId?: string;
  @ApiProperty({ type: [InventoryReservationItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => InventoryReservationItemDto)
  items!: InventoryReservationItemDto[];
  @ApiPropertyOptional({ example: 15 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) durationMinutes?: number;
}
