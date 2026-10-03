import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import type { DeliveryMethod } from '../schemas/shipping.schema.js';

export class ShippingAddressDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty()
  @IsString()
  addressLine1!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiProperty()
  @IsString()
  city!: string;

  @ApiProperty()
  @IsString()
  state!: string;

  @ApiPropertyOptional({ default: 'IN' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty()
  @IsString()
  postalCode!: string;
}

export class ShippingPackageDto {
  @ApiProperty({ example: 20 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(300)
  lengthCm!: number;

  @ApiProperty({ example: 15 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(300)
  widthCm!: number;

  @ApiProperty({ example: 8 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(300)
  heightCm!: number;

  @ApiProperty({ example: 0.5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @Max(100)
  weightKg!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class CalculateShippingRateDto {
  @ApiProperty({ type: ShippingAddressDto })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  origin!: ShippingAddressDto;

  @ApiProperty({ type: ShippingAddressDto })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  destination!: ShippingAddressDto;

  @ApiProperty({ type: [ShippingPackageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShippingPackageDto)
  packages!: ShippingPackageDto[];

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  orderValue!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    enum: ['shipping', 'local_delivery', 'store_pickup'],
  })
  @IsOptional()
  @IsIn(['shipping', 'local_delivery', 'store_pickup'])
  deliveryMethod?: DeliveryMethod;
}
