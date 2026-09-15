import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty({ example: 'aurora-gold-plated-necklace', description: 'Product ID or slug' })
  @IsString()
  @IsNotEmpty({ message: 'Product ID is required.' })
  productId: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Quantity must be at least 1.' })
  @Max(50)
  quantity: number;

  @ApiPropertyOptional({ example: 'Gold' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 'Standard (16" + 2")' })
  @IsOptional()
  @IsString()
  size?: string;
}

export class CustomerDetailsDto {
  @ApiProperty({ example: 'Eleanor Vance' })
  @IsString()
  @IsNotEmpty({ message: 'Customer full name is required.' })
  fullName: string;

  @ApiProperty({ example: 'eleanor@example.com' })
  @IsEmail({}, { message: 'Valid email address is required.' })
  email: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required.' })
  phone: string;
}

export class ShippingAddressDto {
  @ApiProperty({ example: '42 Heritage Boulevard, Colaba' })
  @IsString()
  @IsNotEmpty({ message: 'Street address is required.' })
  address: string;

  @ApiProperty({ example: 'Mumbai' })
  @IsString()
  @IsNotEmpty({ message: 'City is required.' })
  city: string;

  @ApiProperty({ example: 'Maharashtra' })
  @IsString()
  @IsNotEmpty({ message: 'State is required.' })
  state: string;

  @ApiProperty({ example: '400001' })
  @IsString()
  @IsNotEmpty({ message: 'Postal code is required.' })
  postalCode: string;

  @ApiPropertyOptional({ example: 'India', default: 'India' })
  @IsOptional()
  @IsString()
  country?: string = 'India';
}

export class CreateOrderDto {
  @ApiProperty({ type: CustomerDetailsDto })
  @ValidateNested()
  @Type(() => CustomerDetailsDto)
  customer: CustomerDetailsDto;

  @ApiProperty({ type: ShippingAddressDto })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({ enum: ['standard', 'express'], default: 'standard' })
  @IsOptional()
  @IsIn(['standard', 'express'])
  deliveryOption?: 'standard' | 'express' = 'standard';

  @ApiPropertyOptional({ example: 'SHINE10' })
  @IsOptional()
  @IsString()
  promoCode?: string;

  @ApiPropertyOptional({ enum: ['razorpay', 'cod'], default: 'cod' })
  @IsOptional()
  @IsIn(['razorpay', 'cod'], { message: 'Payment method must be online (razorpay) or cash on delivery (cod).' })
  paymentMethod?: 'razorpay' | 'cod' = 'cod';

  @ApiPropertyOptional({ example: 'Please gift wrap' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
