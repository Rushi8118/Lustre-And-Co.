import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import type { ShippingProviderName } from '../schemas/shipping.schema.js';

export class CreateShipmentDto {
  @ApiProperty()
  @IsUUID()
  orderId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceCode?: string;

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
  provider?: ShippingProviderName;
}
