import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidateCouponDto {
  @ApiProperty({ example: 'SHINE10', description: 'Promo code string (case-insensitive)' })
  @IsString()
  @IsNotEmpty({ message: 'Please enter a promo code.' })
  code: string;

  @ApiPropertyOptional({ example: 1499, description: 'Current cart subtotal in INR' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  subtotal?: number;
}
