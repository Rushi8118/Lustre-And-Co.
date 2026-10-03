import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateShippingSettingsDto {
  @ApiPropertyOptional({
    enum: [
      'shiprocket',
      'delhivery',
      'blue_dart',
      'easyship',
      'shippo',
      'local_delivery',
      'store_pickup',
    ],
  })
  @IsOptional()
  @IsIn([
    'shiprocket',
    'delhivery',
    'blue_dart',
    'easyship',
    'shippo',
    'local_delivery',
    'store_pickup',
  ])
  defaultProvider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fallbackProvider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoCreateShipments?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoSyncTracking?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  pickupAddress?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  localDeliveryEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  storePickupEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  freeShippingThreshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  flatShippingRate?: number;
}
