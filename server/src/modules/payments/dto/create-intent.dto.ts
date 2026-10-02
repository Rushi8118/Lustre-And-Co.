import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentIntentDto {
  @ApiProperty({
    example: 'LST-89421056',
    description: 'Order ID to create payment intent for',
  })
  @IsString()
  @IsNotEmpty({ message: 'Order ID is required to initialize payment.' })
  orderId: string;

  @ApiPropertyOptional({
    example: 'INR',
    default: 'INR',
    description: 'Currency code (default INR)',
  })
  @IsOptional()
  @IsString()
  currency?: string = 'INR';
}
