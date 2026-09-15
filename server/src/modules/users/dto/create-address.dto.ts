import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({ example: 'Eleanor Vance', description: 'Recipient full name' })
  @IsString()
  @IsNotEmpty({ message: 'Recipient name is required' })
  fullName: string;

  @ApiProperty({ example: '9876543210', description: 'Contact phone number' })
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  phone: string;

  @ApiProperty({ example: '42 Heritage Boulevard, Colaba', description: 'Street address' })
  @IsString()
  @IsNotEmpty({ message: 'Street address is required' })
  address: string;

  @ApiProperty({ example: 'Mumbai', description: 'City' })
  @IsString()
  @IsNotEmpty({ message: 'City is required' })
  city: string;

  @ApiProperty({ example: 'Maharashtra', description: 'State or Province' })
  @IsString()
  @IsNotEmpty({ message: 'State is required' })
  state: string;

  @ApiProperty({ example: '400001', description: 'Postal or ZIP code' })
  @IsString()
  @IsNotEmpty({ message: 'Postal code is required' })
  postalCode: string;

  @ApiPropertyOptional({ example: 'India', default: 'India', description: 'Country' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ default: false, description: 'Set as default shipping address' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
